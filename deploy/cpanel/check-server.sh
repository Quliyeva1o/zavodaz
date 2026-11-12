#!/usr/bin/env bash
# Checks the cPanel account before the first deploy (cPanel → Terminal):
#   DATABASE_URL='postgres://…' bash ~/zavod-src/deploy/cpanel/check-server.sh
set -uo pipefail

NODE=/opt/alt/alt-nodejs22/root/usr/bin/node
echo "node 22: $($NODE -v 2>/dev/null || echo 'yoxdur')"
echo "disk:"; quota -s 2>/dev/null || du -sh "$HOME" 2>/dev/null
echo "thread-lər: $(ps -u "$(id -u)" -L --no-headers | wc -l) / 150"
echo "Node prosesləri (yaddaş):"
ps -u "$(id -u)" -o rss=,args= | awk '/node/ && !/awk/ {printf "  %5.0f MB  %s\n", $1/1024, substr($0, index($0,$2), 70)}'

if [ -n "${DATABASE_URL:-}" ]; then
  echo "PostgreSQL: $(psql "$DATABASE_URL" -Atc 'show server_version')"
  for ext in pg_trgm unaccent; do
    if psql "$DATABASE_URL" -qc "create extension if not exists $ext" 2>/dev/null; then
      echo "  $ext: OK"
    else
      echo "  $ext: İCAZƏ YOXDUR — axtarış üçün fallback lazımdır (spec 9.7)"
    fi
  done
else
  echo "DATABASE_URL verilməyib — Postgres yoxlanılmadı"
fi
