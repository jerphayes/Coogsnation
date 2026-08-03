#!/usr/bin/env bash
set -Eeuo pipefail

INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
if ! [[ "${INTERVAL_SECONDS}" =~ ^[0-9]+$ ]] || (( INTERVAL_SECONDS < 3600 )); then
  echo "[BACKUP] BACKUP_INTERVAL_SECONDS must be an integer of at least 3600" >&2
  exit 1
fi

while true; do
  /opt/coogsnation-backup/backup-postgres.sh
  echo "[BACKUP] Sleeping ${INTERVAL_SECONDS} seconds"
  sleep "${INTERVAL_SECONDS}"
done
