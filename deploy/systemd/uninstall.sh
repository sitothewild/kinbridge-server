#!/usr/bin/env bash
# Fully remove the KinBridge native install.
# By default preserves /var/lib/kinbridge/data (contains id_ed25519).
# Pass --purge to also remove data and config.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "error: run as root (sudo)" >&2
  exit 1
fi

PURGE=false
for arg in "$@"; do
  case "$arg" in
    --purge) PURGE=true ;;
    *) echo "unknown flag: $arg" >&2; exit 1 ;;
  esac
done

echo "==> Stopping + disabling services"
systemctl disable --now kinbridge-hbbs.service kinbridge-hbbr.service 2>/dev/null || true

echo "==> Removing binaries + units"
rm -f /usr/local/bin/hbbs /usr/local/bin/hbbr
rm -f /etc/systemd/system/kinbridge-hbbs.service /etc/systemd/system/kinbridge-hbbr.service
systemctl daemon-reload

if [[ "$PURGE" == true ]]; then
  echo "==> Purging data + config (--purge)"
  rm -rf /var/lib/kinbridge /etc/kinbridge
  userdel kinbridge 2>/dev/null || true
  echo "   (id_ed25519 deleted — all paired clients must re-trust the server)"
else
  echo "==> Preserving /var/lib/kinbridge and /etc/kinbridge (use --purge to remove)"
fi

echo "==> Done."
