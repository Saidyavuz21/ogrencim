#!/usr/bin/env bash
# Sunucu betiklerinin ortak kısmı. Sunucu adresi depoya girmez; kökteki .sunucu.env dosyasından okunur.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONF="$ROOT/.sunucu.env"
if [ ! -f "$CONF" ]; then
  echo "HATA: $CONF bulunamadı. Bu dosya depoya gönderilmez; docs/DEVIR_NOTU.md içindeki örneğe göre oluşturun." >&2
  exit 2
fi
# shellcheck disable=SC1090
. "$CONF"
: "${SUNUCU_SSH:?SUNUCU_SSH tanımlı değil (ör. root@1.2.3.4)}"

# Windows'ta Git Bash'in ssh'i Windows ssh-agent'ı kullanamaz; sistemdeki OpenSSH tercih edilir.
if [ -z "${SSH_BIN:-}" ]; then
  if [ -x "/c/Windows/System32/OpenSSH/ssh.exe" ]; then SSH_BIN="/c/Windows/System32/OpenSSH/ssh.exe"; else SSH_BIN="ssh"; fi
fi

# MSYS_NO_PATHCONV: Git Bash, /root/... ile başlayan argümanları Windows yoluna çevirmesin.
sunucu() { MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*' "$SSH_BIN" -o BatchMode=yes -o ConnectTimeout=20 "$SUNUCU_SSH" "$@"; }
