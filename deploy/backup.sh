#!/usr/bin/env bash
# Blogun veritabanını ve yüklenen görselleri yedekler. Sunucuda deploy/ klasöründe çalıştırılır:
#   ./backup.sh
# Günlük otomatik yedek için (crontab -e):
#   30 3 * * * /home/deploy/blogsite/deploy/backup.sh >> /home/deploy/backups/blogsite/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")"

OUT="${BACKUP_DIR:-$HOME/backups/blogsite}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

# 1) Veritabanı (sıkıştırılmış SQL)
docker compose -f docker-compose.prod.yml exec -T blogsite-db pg_dump -U blog -d blog --clean --if-exists --no-owner | gzip > "$OUT/db-$STAMP.sql.gz"

# 2) Yüklenen görseller (Docker volume'ünden)
docker run --rm -v blogsite-prod_media:/media:ro -v "$OUT":/out alpine tar czf "/out/media-$STAMP.tar.gz" -C /media .

# 3) Eski yedekleri temizle
find "$OUT" -type f \( -name 'db-*.sql.gz' -o -name 'media-*.tar.gz' \) -mtime +"$KEEP_DAYS" -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] yedek alındı: $OUT/db-$STAMP.sql.gz, media-$STAMP.tar.gz"
