#!/usr/bin/env bash
# Install KinBridge (rustdesk-server) as native systemd services.
# Idempotent — safe to re-run. Preserves existing /var/lib/kinbridge/data.
#
# Usage:
#   sudo RELAY_HOST=192.168.68.54 ./install.sh
#   # or set RELAY_HOST in /etc/kinbridge/hbbs.env and rerun.

set -euo pipefail

RELAY_HOST="${RELAY_HOST:-}"
RUSTDESK_VERSION="${RUSTDESK_VERSION:-1.1.15}"
ARCH="${ARCH:-amd64}"

# rustdesk-server-linux-amd64.zip — sha256 for 1.1.15
RELEASE_SHA256_amd64="c553972fd844c0224bc18eb3776f48ee5e018c6d4748729e1cfb14d32a46b394"

if [[ $EUID -ne 0 ]]; then
  echo "error: run as root (sudo)" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Creating 'kinbridge' system user"
if ! id -u kinbridge >/dev/null 2>&1; then
  useradd --system --no-create-home --shell /usr/sbin/nologin kinbridge
fi

echo "==> Creating dirs"
mkdir -p /var/lib/kinbridge/data /etc/kinbridge
chown -R kinbridge:kinbridge /var/lib/kinbridge
chmod 750 /var/lib/kinbridge /var/lib/kinbridge/data

echo "==> Installing hbbs.env"
if [[ ! -f /etc/kinbridge/hbbs.env ]]; then
  install -m 640 -o root -g kinbridge "$SCRIPT_DIR/hbbs.env.example" /etc/kinbridge/hbbs.env
fi
if [[ -n "$RELAY_HOST" ]]; then
  sed -i "s|^RELAY_HOST=.*|RELAY_HOST=${RELAY_HOST}|" /etc/kinbridge/hbbs.env
fi

echo "==> Downloading rustdesk-server v${RUSTDESK_VERSION} (${ARCH})"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
ZIP_URL="https://github.com/rustdesk/rustdesk-server/releases/download/${RUSTDESK_VERSION}/rustdesk-server-linux-${ARCH}.zip"
curl -fsSL -o "$TMP/rustdesk-server.zip" "$ZIP_URL"

case "$ARCH" in
  amd64)
    EXPECTED_SHA="$RELEASE_SHA256_amd64"
    ;;
  *)
    EXPECTED_SHA=""
    ;;
esac

if [[ -n "$EXPECTED_SHA" ]]; then
  ACTUAL_SHA="$(sha256sum "$TMP/rustdesk-server.zip" | awk '{print $1}')"
  if [[ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]]; then
    echo "error: sha256 mismatch for rustdesk-server zip" >&2
    echo "  expected: $EXPECTED_SHA" >&2
    echo "  actual:   $ACTUAL_SHA" >&2
    exit 1
  fi
fi

echo "==> Extracting + installing binaries"
unzip -q "$TMP/rustdesk-server.zip" -d "$TMP/unpack"
BIN_DIR="$(find "$TMP/unpack" -type f -name hbbs -printf '%h\n' | head -1)"
install -o root -g root -m 0755 "$BIN_DIR/hbbs" /usr/local/bin/hbbs
install -o root -g root -m 0755 "$BIN_DIR/hbbr" /usr/local/bin/hbbr

echo "==> Installing systemd units"
install -o root -g root -m 0644 "$SCRIPT_DIR/kinbridge-hbbr.service" /etc/systemd/system/kinbridge-hbbr.service
install -o root -g root -m 0644 "$SCRIPT_DIR/kinbridge-hbbs.service" /etc/systemd/system/kinbridge-hbbs.service
systemctl daemon-reload

echo "==> Enabling + starting services"
systemctl enable --now kinbridge-hbbr.service
systemctl enable --now kinbridge-hbbs.service

sleep 2
echo "==> Status"
systemctl --no-pager --lines=5 status kinbridge-hbbr.service || true
systemctl --no-pager --lines=5 status kinbridge-hbbs.service || true

echo
echo "==> Done."
echo "Config:    /etc/kinbridge/hbbs.env"
echo "Data:      /var/lib/kinbridge/data"
echo "Pub key:   /var/lib/kinbridge/data/id_ed25519.pub"
echo "Logs:      journalctl -u kinbridge-hbbs -u kinbridge-hbbr -f"
