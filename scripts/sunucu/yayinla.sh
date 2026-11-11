#!/usr/bin/env bash
# tofutr.com'u yayınlar: GitHub'daki main dalının son commit'i sunucuda derlenir ve yayına alınır.
# Yayınlanan şey GitHub'daki koddur; yereldeki commit edilmemiş ya da push edilmemiş değişiklikler yayına girmez.
#
#   bash scripts/sunucu/yayinla.sh
. "$(dirname "${BASH_SOURCE[0]}")/ortak.sh"
cd "$ROOT"

git fetch --quiet origin main
yerel="$(git rev-parse HEAD)"
uzak="$(git rev-parse origin/main)"
dal="$(git branch --show-current)"

if [ "$dal" != "main" ]; then
  echo "UYARI: şu an '$dal' dalındasınız. Yayınlanacak olan origin/main ($(git rev-parse --short origin/main))."
fi
if [ "$yerel" != "$uzak" ]; then
  echo "UYARI: yerel HEAD ($(git rev-parse --short HEAD)) ile origin/main ($(git rev-parse --short origin/main)) farklı."
  echo "       Push edilmemiş commit'ler yayına girmez."
fi
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "UYARI: commit edilmemiş değişiklikler var; bunlar yayına girmez."
fi

echo "Yayınlanıyor: origin/main $(git rev-parse --short origin/main) — $(git log -1 --format=%s origin/main)"
sunucu /root/bin/tofutr-yayinla
