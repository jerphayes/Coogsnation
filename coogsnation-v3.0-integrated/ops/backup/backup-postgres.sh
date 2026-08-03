#!/usr/bin/env bash
set -Eeuo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOSTNAME_TAG="${BACKUP_HOSTNAME_TAG:-coogsnation}"
PLAIN_FILE="${BACKUP_DIR}/${HOSTNAME_TAG}-${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"
umask 077

echo "[BACKUP] Creating PostgreSQL backup ${PLAIN_FILE}"
pg_dump --dbname="${DATABASE_URL}" --format=custom --no-owner --no-acl --file="${PLAIN_FILE}"

FINAL_FILE="${PLAIN_FILE}"
if [[ -n "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]]; then
  if ! command -v openssl >/dev/null 2>&1; then
    echo "[BACKUP] openssl is required for encrypted backups" >&2
    exit 1
  fi
  FINAL_FILE="${PLAIN_FILE}.enc"
  openssl enc -aes-256-cbc -pbkdf2 -salt \
    -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
    -in "${PLAIN_FILE}" -out "${FINAL_FILE}"
  rm -f "${PLAIN_FILE}"
elif [[ "${NODE_ENV:-production}" == "production" ]]; then
  echo "[BACKUP] Refusing an unencrypted production backup. Set BACKUP_ENCRYPTION_PASSPHRASE." >&2
  rm -f "${PLAIN_FILE}"
  exit 1
fi

sha256sum "${FINAL_FILE}" > "${FINAL_FILE}.sha256"
find "${BACKUP_DIR}" -type f -mtime "+${RETENTION_DAYS}" -delete

echo "[BACKUP] Completed ${FINAL_FILE}"
echo "[BACKUP] Sync this file and its .sha256 checksum to independent offsite storage."
