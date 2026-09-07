#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT/docker-compose.prod.yml"
ENV_FILE="$ROOT/.env"

cd "$ROOT"

echo "=== COOGSNATION SAFE APP DEPLOY ==="

for cmd in docker git curl python3; do
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

git diff --check

if [ -n "$(git status --porcelain)" ]; then
  echo "STOP: deployment candidate is not clean"
  git status --short
  exit 1
fi

COMMIT="$(git rev-parse HEAD)"
SHORT="${COMMIT:0:12}"

echo "CANDIDATE: $COMMIT"

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
  echo "STOP: could not determine compose project"
  exit 1
}

OLD_IMAGE="$(docker inspect -f '{{.Image}}' "$APP_CID")"
APP_IMAGE_REF="$(docker inspect -f '{{.Config.Image}}' "$APP_CID")"

STAMP="$(date +%Y%m%d-%H%M%S)"
ROLLBACK_TAG="coogs-production-rollback:$STAMP"

echo "PROJECT:        $PROJECT"
echo "CURRENT IMAGE:  $OLD_IMAGE"
echo "IMAGE REF:      $APP_IMAGE_REF"
echo "ROLLBACK IMAGE: $ROLLBACK_TAG"

docker tag "$OLD_IMAGE" "$ROLLBACK_TAG"

wait_health() {
  local ok=0
  for i in {1..24}; do
    echo "health $i/24"
    if curl -fsS \
      http://127.0.0.1:5000/healthz \
      >/tmp/coogs-safe-health.out 2>/dev/null; then
      ok=1
      break
    fi
    sleep 5
  done
  [ "$ok" -eq 1 ]
}

verify_browser_bundle() {
  local html js
  html="$(curl -fsS http://127.0.0.1:5000/)"
  js="$(
    printf '%s' "$html" |
      grep -oE '/assets/[^"]+\.js' |
      head -1
  )"
  test -n "$js"
  curl -fsS \
    -o /tmp/coogs-safe-main.js \
    "http://127.0.0.1:5000$js"
  test -s /tmp/coogs-safe-main.js
  echo "LIVE JS: $js"
}

verify_sports() {
  curl -fsS \
    http://127.0.0.1:5000/api/sports/ticker |
  python3 -c '
import json,sys
games=json.load(sys.stdin)["games"]
bad=[
    g for g in games
    if g.get("status")=="FINAL"
    and g.get("awayScore")==0
    and g.get("homeScore")==0
]
print("GAMES:",len(games))
print("0-0 FINALS:",len(bad))
assert not bad
'
}

rollback() {
  echo
  echo "!!! DEPLOY VERIFICATION FAILED !!!"
  echo "Rolling back to: $ROLLBACK_TAG"

  docker compose \
    --project-name "$PROJECT" \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE" \
    logs --tail=100 app || true

  docker tag "$ROLLBACK_TAG" "$APP_IMAGE_REF"

  docker compose \
    --project-name "$PROJECT" \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE" \
    up -d --no-deps --force-recreate app

  if wait_health; then
    echo "ROLLBACK HEALTH: PASS"
    cat /tmp/coogs-safe-health.out
    echo
    echo "PRODUCTION RESTORED."
  else
    echo "CRITICAL: rollback did not become healthy."
    exit 2
  fi

  exit 1
}

echo
echo "=== RELEASE GATE ==="

CHECK_IMAGE="coogs-release-check:$SHORT"

docker build \
  --target development \
  -t "$CHECK_IMAGE" \
  "$ROOT"

docker run --rm \
  "$CHECK_IMAGE" \
  npm run release:check

echo
echo "=== BUILD PRODUCTION APP ==="

docker compose \
  --project-name "$PROJECT" \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE" \
  build app

echo
echo "=== RECREATE APP ONLY ==="

docker compose \
  --project-name "$PROJECT" \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE" \
  up -d --no-deps --force-recreate app

echo
echo "=== VERIFY NEW APP ==="

wait_health || rollback

cat /tmp/coogs-safe-health.out
echo

verify_browser_bundle || rollback
verify_sports || rollback

NEW_CID="$(
  docker compose \
    --project-name "$PROJECT" \
    --env-file "$ENV_FILE" \
    -f "$COMPOSE" \
    ps -q app
)"

test -n "$NEW_CID" || rollback

STATE="$(docker inspect -f '{{.State.Status}}' "$NEW_CID")"
HEALTH="$(
  docker inspect \
    -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' \
    "$NEW_CID"
)"

echo
echo "=== FINAL STATE ==="
echo "CONTAINER: $NEW_CID"
echo "STATE:     $STATE"
echo "HEALTH:    $HEALTH"

test "$STATE" = "running" || rollback
test "$HEALTH" = "healthy" || rollback

echo
echo "======================================"
echo "SAFE DEPLOY: PASS"
echo "COMMIT: $COMMIT"
echo "ROLLBACK IMAGE RETAINED: $ROLLBACK_TAG"
echo "======================================"
