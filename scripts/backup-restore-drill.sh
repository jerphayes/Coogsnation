#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT/docker-compose.prod.yml"
ENV_FILE="$ROOT/.env"

cd "$ROOT"

echo "=== COOGSNATION BACKUP / RESTORE DRILL ==="

for cmd in docker grep; do
  command -v "$cmd" >/dev/null || {
    echo "STOP: missing command: $cmd"
    exit 1
  }
done

test -f "$COMPOSE" || {
  echo "STOP: docker-compose.prod.yml missing"
  exit 1
}

test -f "$ENV_FILE" || {
  echo "STOP: .env missing"
  exit 1
}

if ! grep -Eq '^BACKUP_ENCRYPTION_PASSPHRASE=.+$' "$ENV_FILE"; then
  echo "STOP: BACKUP_ENCRYPTION_PASSPHRASE is not configured in .env"
  echo "No production backup was attempted."
  exit 1
fi

APP_CID="$(
  docker ps \
    --filter label=com.docker.compose.service=app \
    --format '{{.ID}}' |
    head -1
)"

test -n "$APP_CID" || {
  echo "STOP: running production app container not found"
  exit 1
}

PROJECT="$(
  docker inspect \
    -f '{{index .Config.Labels "com.docker.compose.project"}}' \
    "$APP_CID"
)"

test -n "$PROJECT" || {
  echo "STOP: compose project could not be determined"
  exit 1
}

DB_CID="$(
  docker ps \
    --filter "label=com.docker.compose.project=$PROJECT" \
    --filter label=com.docker.compose.service=database \
    --format '{{.ID}}' |
    head -1
)"

test -n "$DB_CID" || {
  echo "STOP: production database container not found"
  exit 1
}

PROD_USER="$(docker exec "$DB_CID" printenv POSTGRES_USER)"
PROD_DB="$(docker exec "$DB_CID" printenv POSTGRES_DB)"

test -n "$PROD_USER"
test -n "$PROD_DB"

echo "PROJECT: $PROJECT"
echo "PRODUCTION DATABASE: $PROD_DB"
echo
echo "=== CREATE ENCRYPTED PRODUCTION BACKUP ==="

docker compose \
  --project-name "$PROJECT" \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE" \
  --profile backup \
  run --rm backup

BACKUP_VOLUME="$(
  docker volume ls \
    --filter "label=com.docker.compose.project=$PROJECT" \
    --filter label=com.docker.compose.volume=database_backups \
    --format '{{.Name}}' |
    head -1
)"

test -n "$BACKUP_VOLUME" || {
  echo "STOP: database_backups volume not found"
  exit 1
}

LATEST="$(
  docker run --rm \
    -v "$BACKUP_VOLUME:/backups:ro" \
    postgres:16 \
    sh -lc 'ls -1t /backups/*.dump.enc 2>/dev/null | head -1'
)"

test -n "$LATEST" || {
  echo "STOP: encrypted backup file was not created"
  exit 1
}

echo "BACKUP VOLUME: $BACKUP_VOLUME"
echo "LATEST BACKUP: $LATEST"

docker run --rm \
  -v "$BACKUP_VOLUME:/backups:ro" \
  postgres:16 \
  sh -lc '
    set -eu
    FILE="$1"
    CHECKSUM="${FILE}.sha256"
    test -s "$FILE"
    test -s "$CHECKSUM"
    cd /backups
    sha256sum -c "$(basename "$CHECKSUM")"
    ls -lh "$FILE" "$CHECKSUM"
  ' sh "$LATEST"

echo
echo "=== START ISOLATED RESTORE DATABASE ==="

STAMP="$(date +%Y%m%d-%H%M%S)"
RESTORE_DB="coogs-restore-drill-$STAMP"
RESTORE_NET="coogs-restore-net-$STAMP"
RESTORE_PASSWORD="coogs_restore_drill_only"
RESTORE_DATABASE="restore_test"

cleanup() {
  set +e
  docker rm -f "$RESTORE_DB" >/dev/null 2>&1
  docker network rm "$RESTORE_NET" >/dev/null 2>&1
}
trap cleanup EXIT

docker network create "$RESTORE_NET" >/dev/null

docker run -d \
  --name "$RESTORE_DB" \
  --network "$RESTORE_NET" \
  -e POSTGRES_PASSWORD="$RESTORE_PASSWORD" \
  -e POSTGRES_DB="$RESTORE_DATABASE" \
  postgres:16 >/dev/null

READY=0
for i in {1..30}; do
  if docker exec "$RESTORE_DB" \
    pg_isready -U postgres -d "$RESTORE_DATABASE" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 2
done

test "$READY" -eq 1 || {
  echo "STOP: isolated restore database did not become ready"
  exit 1
}

echo "ISOLATED DATABASE: READY"

echo
echo "=== RESTORE BACKUP INTO ISOLATED DATABASE ==="

docker run --rm \
  --network "$RESTORE_NET" \
  --env-file "$ENV_FILE" \
  -e "DATABASE_URL=postgresql://postgres:${RESTORE_PASSWORD}@${RESTORE_DB}:5432/${RESTORE_DATABASE}" \
  -v "$BACKUP_VOLUME:/backups:ro" \
  -v "$ROOT/ops/backup:/opt/coogsnation-backup:ro" \
  postgres:16 \
  bash /opt/coogsnation-backup/restore-postgres.sh "$LATEST"

echo
echo "=== COMPARE PRODUCTION VS RESTORE ==="

PROD_TABLES="$(
  docker exec "$DB_CID" \
    psql -U "$PROD_USER" -d "$PROD_DB" -Atc \
    "SELECT count(*) FROM pg_tables WHERE schemaname='public';"
)"

RESTORE_TABLES="$(
  docker exec "$RESTORE_DB" \
    psql -U postgres -d "$RESTORE_DATABASE" -Atc \
    "SELECT count(*) FROM pg_tables WHERE schemaname='public';"
)"

echo "PUBLIC TABLES production=$PROD_TABLES restore=$RESTORE_TABLES"

test "$PROD_TABLES" -gt 0
test "$RESTORE_TABLES" = "$PROD_TABLES"

compare_table() {
  local table="$1"
  local exists

  exists="$(
    docker exec "$DB_CID" \
      psql -U "$PROD_USER" -d "$PROD_DB" -Atc \
      "SELECT CASE WHEN to_regclass('public.${table}') IS NULL THEN 'no' ELSE 'yes' END;"
  )"

  if [ "$exists" != "yes" ]; then
    echo "$table: not present in production; skipped"
    return 0
  fi

  local prod_count restore_exists restore_count

  restore_exists="$(
    docker exec "$RESTORE_DB" \
      psql -U postgres -d "$RESTORE_DATABASE" -Atc \
      "SELECT CASE WHEN to_regclass('public.${table}') IS NULL THEN 'no' ELSE 'yes' END;"
  )"

  test "$restore_exists" = "yes"

  prod_count="$(
    docker exec "$DB_CID" \
      psql -U "$PROD_USER" -d "$PROD_DB" -Atc \
      "SELECT count(*) FROM \"${table}\";"
  )"

  restore_count="$(
    docker exec "$RESTORE_DB" \
      psql -U postgres -d "$RESTORE_DATABASE" -Atc \
      "SELECT count(*) FROM \"${table}\";"
  )"

  echo "$table production=$prod_count restore=$restore_count"
  test "$restore_count" = "$prod_count"
}

compare_table users
compare_table forum_topics
compare_table forum_categories

echo
echo "=== RESTORE DATABASE HEALTH ==="
docker exec "$RESTORE_DB" \
  psql -U postgres -d "$RESTORE_DATABASE" -Atc \
  "SELECT current_database(), count(*) FROM pg_tables WHERE schemaname='public';"

echo
echo "======================================"
echo "BACKUP / RESTORE DRILL: PASS"
echo "BACKUP RETAINED: $LATEST"
echo "PRODUCTION DATABASE: UNMODIFIED"
echo "RESTORE TARGET: EPHEMERAL / ISOLATED"
echo "======================================"
