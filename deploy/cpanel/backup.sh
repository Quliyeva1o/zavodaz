#!/usr/bin/env bash
# Daily backup for cPanel → Cron Jobs (e.g. every night at 03:45):
#   45 3 * * *  bash $HOME/zavod-src/deploy/cpanel/backup.sh >> $HOME/backups/zavod/backup.log 2>&1
#
# Database every day (kept 14 days), uploaded media every Sunday (kept 5 weeks).
# Files land in ~/backups/zavod — outside the web root; JetBackup copies them off-server too.
set -euo pipefail

APP="${APP_DIR:-$HOME/zavod-app}"
DEST="${BACKUP_DIR:-$HOME/backups/zavod}"
mkdir -p "$DEST"
STAMP="$(date +%Y%m%d-%H%M)"

DATABASE_URL="$(grep -E '^DATABASE_URL=' "$APP/shared/.env" | head -1 | cut -d= -f2- | tr -d '"'"'")"
if [ -z "$DATABASE_URL" ]; then
  echo "XƏTA: $APP/shared/.env faylında DATABASE_URL boşdur və ya yoxdur" >&2
  exit 1
fi

# Written to a temp file first and moved into place only on success, so a failed run never leaves a broken backup.
TMP="$(mktemp "$DEST/.tmp-XXXXXX")"
trap 'rm -f "$TMP"' EXIT

pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip > "$TMP"
mv "$TMP" "$DEST/db-$STAMP.sql.gz"

if [ "$(date +%u)" = 7 ]; then
  TMP="$(mktemp "$DEST/.tmp-XXXXXX")"
  tar -czf "$TMP" -C "$APP/shared" uploads
  mv "$TMP" "$DEST/uploads-$STAMP.tar.gz"
fi

find "$DEST" -name 'db-*.sql.gz' -mtime +14 -delete
find "$DEST" -name 'uploads-*.tar.gz' -mtime +35 -delete
