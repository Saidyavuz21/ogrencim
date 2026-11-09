#!/usr/bin/env bash
# ========================================================
# Günlük yedek: veritabanı dökümü + depolama dosyaları, şifreli, 30 gün saklama.
# Ayrıntı: docs/YEDEKLEME.md
#
# Gerekli ortam değişkenleri (betik içine YAZILMAZ; sunucuda /etc/ogrenci-backup.env gibi
# yalnızca root'un okuyabildiği bir dosyada tutulur):
#   DATABASE_URL         postgres://postgres:...@host:5432/postgres   (doğrudan bağlantı, pooler değil)
#   BACKUP_PASSPHRASE    yedekleri şifreleyen parola (kaybolursa yedek açılamaz!)
#   SUPABASE_URL         https://xxx.supabase.co  (depolama yedeği için)
#   SUPABASE_SERVICE_KEY service_role anahtarı    (depolama yedeği için)
# İsteğe bağlı:
#   BACKUP_DIR           varsayılan /var/backups/ogrenci
#   KEEP_DAYS            varsayılan 30
#
# Cron örneği (her gece 03:15):
#   15 3 * * * set -a; . /etc/ogrenci-backup.env; set +a; /opt/ogrenci/scripts/backup/backup.sh >> /var/log/ogrenci-backup.log 2>&1
# ========================================================
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL tanımlı değil}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE tanımlı değil}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ogrenci}"
KEEP_DAYS="${KEEP_DAYS:-30}"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
umask 077
mkdir -p "$BACKUP_DIR"

log() { echo "[$(date -u +%FT%TZ)] $*"; }

encrypt() { # $1 kaynak, $2 hedef
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
      --symmetric --cipher-algo AES256 -o "$2" "$1" 3<<<"$BACKUP_PASSPHRASE"
}

# 1) Veritabanı: uygulama şemaları + kullanıcılar (auth) + depolama kayıtları (storage)
log "Veritabanı dökümü alınıyor"
pg_dump "$DATABASE_URL" \
  --format=custom --compress=9 --no-owner --no-privileges \
  --schema=public --schema=private --schema=auth --schema=storage \
  --file="$WORK/db.dump"
encrypt "$WORK/db.dump" "$BACKUP_DIR/db-$STAMP.dump.gpg"
log "Veritabanı: $(du -h "$BACKUP_DIR/db-$STAMP.dump.gpg" | cut -f1)"

# 2) Depolama dosyaları (ödev teslimleri, öğretmen dosyaları, görseller)
if [[ -n "${SUPABASE_URL:-}" && -n "${SUPABASE_SERVICE_KEY:-}" ]]; then
  log "Depolama dosyaları indiriliyor"
  node "$HERE/storage-backup.mjs" "$WORK/storage"
  tar -C "$WORK" -czf "$WORK/storage.tar.gz" storage
  encrypt "$WORK/storage.tar.gz" "$BACKUP_DIR/storage-$STAMP.tar.gz.gpg"
  log "Depolama: $(du -h "$BACKUP_DIR/storage-$STAMP.tar.gz.gpg" | cut -f1)"
else
  log "UYARI: SUPABASE_URL / SUPABASE_SERVICE_KEY yok, depolama yedeği atlandı"
fi

# 3) Eski yedekleri sil
find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.gpg' -mtime +"$KEEP_DAYS" -print -delete | sed 's/^/silindi: /'
log "Bitti"
