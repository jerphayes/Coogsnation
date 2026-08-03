#!/usr/bin/env bash
set -Eeuo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${1:?Usage: restore-postgres.sh <backup.dump|backup.dump.enc>}"

SOURCE_FILE="$1"
if [[ ! -f "${SOURCE_FILE}" ]]; then
  echo "[RESTORE] Backup not found: ${SOURCE_FILE}" >&2
  exit 1
fi

if [[ -f "${SOURCE_FILE}.sha256" ]]; then
  sha256sum -c "${SOURCE_FILE}.sha256"
fi

TEMP_FILE=""
cleanup() {
  [[ -n "${TEMP_FILE}" ]] && rm -f "${TEMP_FILE}"
}
trap cleanup EXIT

RESTORE_FILE="${SOURCE_FILE}"
if [[ "${SOURCE_FILE}" == *.enc ]]; then
  : "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE is required for encrypted backups}"
  TEMP_FILE="$(mktemp)"
  openssl enc -d -aes-256-cbc -pbkdf2 \
    -pass env:BACKUP_ENCRYPTION_PASSPHRASE \
    -in "${SOURCE_FILE}" -out "${TEMP_FILE}"
  RESTORE_FILE="${TEMP_FILE}"
fi

echo "[RESTORE] Restoring ${SOURCE_FILE}"
pg_restore --dbname="${DATABASE_URL}" --clean --if-exists --no-owner --no-acl "${RESTORE_FILE}"
echo "[RESTORE] Restore completed"
