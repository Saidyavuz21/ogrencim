#!/usr/bin/env bash
# ========================================================
# Yedekten geri yükleme. DİKKAT: hedef veritabanındaki aynı adlı nesnelerin üzerine yazar.
# Önce boş bir test veritabanına geri yükleyip kontrol edin (docs/YEDEKLEME.md → Geri yükleme provası).
#
# Kullanım:
#   TARGET_DATABASE_URL=postgres://… BACKUP_PASSPHRASE=… ./restore.sh /var/backups/ogrenci/db-20261110-031500.dump.gpg
# ========================================================
set -euo pipefail
: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL tanımlı değil}"
: "${BACKUP_PASSPHRASE:?BACKUP_PASSPHRASE tanımlı değil}"
FILE="${1:?Yedek dosyası verilmedi}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
umask 077

gpg --batch --quiet --pinentry-mode loopback --passphrase-fd 3 -o "$WORK/db.dump" -d "$FILE" 3<<<"$BACKUP_PASSPHRASE"
echo "İçerik özeti:"
pg_restore --list "$WORK/db.dump" | grep -c "TABLE DATA" | sed 's/^/  tablo verisi: /'

read -r -p "Hedef: $TARGET_DATABASE_URL — geri yüklensin mi? (evet yazın) " ok
[[ "$ok" == "evet" ]] || { echo "Vazgeçildi."; exit 1; }

pg_restore --dbname="$TARGET_DATABASE_URL" --no-owner --no-privileges --clean --if-exists --single-transaction "$WORK/db.dump"
echo "Geri yükleme bitti."
