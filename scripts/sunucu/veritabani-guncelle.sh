#!/usr/bin/env bash
# supabase/migrations içindeki, canlı veritabanına henüz uygulanmamış dosyaları sırayla uygular.
# Her dosya tek işlemde (transaction) çalışır: hata olursa o dosyanın hiçbir satırı uygulanmaz ve durulur.
#
#   bash scripts/sunucu/veritabani-guncelle.sh            -> yalnızca bekleyenleri listeler
#   bash scripts/sunucu/veritabani-guncelle.sh --uygula   -> bekleyenleri uygular
#
# Dosya adı biçimi: <14 haneli tarih-saat>_<ad>.sql  (ör. 20261114090000_yeni_tablo.sql)
# Uygulanmış bir dosya sonradan DEĞİŞTİRİLMEZ; düzeltme için yeni bir dosya eklenir.
. "$(dirname "${BASH_SOURCE[0]}")/ortak.sh"
cd "$ROOT"

uygula=0
[ "${1:-}" = "--uygula" ] && uygula=1

uygulanan="$(sunucu /root/bin/tofutr-migrate list | tr -d '\r')"
bekleyen=()
for f in supabase/migrations/*.sql; do
  ad="$(basename "$f" .sql)"
  if [[ ! "$ad" =~ ^([0-9]{14})_([A-Za-z0-9_]+)$ ]]; then
    echo "HATA: dosya adı biçime uymuyor: $f" >&2
    exit 2
  fi
  surum="${BASH_REMATCH[1]}"
  grep -qx "$surum" <<<"$uygulanan" || bekleyen+=("$f")
done

if [ ${#bekleyen[@]} -eq 0 ]; then
  echo "Bekleyen migration yok; canlı veritabanı güncel."
  exit 0
fi

echo "Bekleyen ${#bekleyen[@]} migration:"
printf '  %s\n' "${bekleyen[@]}"

if [ $uygula -eq 0 ]; then
  echo
  echo "Uygulamak için: bash scripts/sunucu/veritabani-guncelle.sh --uygula"
  exit 0
fi

for f in "${bekleyen[@]}"; do
  ad="$(basename "$f" .sql)"
  [[ "$ad" =~ ^([0-9]{14})_([A-Za-z0-9_]+)$ ]]
  echo "--> $f"
  sunucu /root/bin/tofutr-migrate apply "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" < "$f"
done
echo "Tamamlandı."
