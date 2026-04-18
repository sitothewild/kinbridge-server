# KinBridge Server — Native systemd Deployment

Recommended deploy method on Olares (its k3s layer blocks both `hostNetwork` and user-created `NetworkPolicy`, which makes in-cluster deploys unworkable for the RustDesk port pattern). These unit files run `hbbs` + `hbbr` directly on the Ubuntu underlay next to k3s, touching nothing Olares owns.

## Layout

| Path | Purpose |
|---|---|
| `/usr/local/bin/hbbs`, `/usr/local/bin/hbbr` | Prebuilt binaries from upstream release |
| `/etc/systemd/system/kinbridge-{hbbs,hbbr}.service` | Unit files |
| `/etc/kinbridge/hbbs.env` | Runtime config (`RELAY_HOST=...`) |
| `/var/lib/kinbridge/data/` | Persistent state: `id_ed25519`, `db_v2.sqlite3` |

Runs as a dedicated system user `kinbridge` (no shell, no home dir). Hardened with `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`, etc.

## Install

```bash
# Copy this directory to the server, then:
sudo RELAY_HOST=192.168.68.54 bash ./install.sh
```

Idempotent — safe to re-run for upgrades or config changes.

## Verify

```bash
systemctl status kinbridge-hbbs kinbridge-hbbr
sudo ss -tulpn | grep -E '2111[5-9]'
journalctl -u kinbridge-hbbs -u kinbridge-hbbr -f

# Capture public key for baking into the client APK
sudo cat /var/lib/kinbridge/data/id_ed25519.pub
```

## Change relay address

```bash
sudo vi /etc/kinbridge/hbbs.env        # edit RELAY_HOST
sudo systemctl restart kinbridge-hbbs  # hbbr is unaffected
```

## Upgrade rustdesk-server

```bash
sudo RUSTDESK_VERSION=1.1.15 bash ./install.sh
sudo systemctl restart kinbridge-hbbs kinbridge-hbbr
```

## Uninstall

```bash
# Keep data (id_ed25519 survives — clients stay paired):
sudo bash ./uninstall.sh

# Or nuke everything:
sudo bash ./uninstall.sh --purge
```
