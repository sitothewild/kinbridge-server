# KinBridge Server Deploy

Self-host the RustDesk signaling + relay stack on a Linux host (Olares).

## Prerequisites
- Docker Engine + `docker compose` plugin
- LAN-reachable host at a known IP (or public DNS)
- Ports 21115/tcp, 21116/tcp+udp, 21117/tcp, 21118/tcp, 21119/tcp open to clients

## First deploy

```bash
# On the server host (e.g. Olares at 192.168.68.54):
mkdir -p /home/olares/kinbridge-server
# Copy deploy/ from this repo into that directory, then:
cd /home/olares/kinbridge-server
cp .env.example .env
# Edit .env and set RELAY_HOST to the LAN IP or public DNS
docker compose up -d
docker compose logs -f
```

## Data & keys

The server generates an Ed25519 key pair on first boot under `./data/`:
- `id_ed25519` — private key. **Never commit this. Back it up.**
- `id_ed25519.pub` — public key. Baked into client builds.

Losing `id_ed25519` forces every paired client to re-trust the server.

## Capture the public key for client builds

```bash
cat ./data/id_ed25519.pub
# Save into kinbridge-client/config/SERVER_PUBLIC_KEY.txt
```

## Health check

```bash
# hbbs listens on 21115, 21116, 21118
# hbbr listens on 21117, 21119
ss -tulpn | grep -E '2111[5-9]'
docker compose ps
```

## Upgrade

```bash
docker compose pull
docker compose up -d
```
