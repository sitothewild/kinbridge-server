# KinBridge Server — Changelog

All notable changes vs. upstream `rustdesk/rustdesk-server`.

## [Unreleased]

### Added
- `deploy/systemd/` — native systemd deploy (what runs in production):
  - `kinbridge-hbbr.service`, `kinbridge-hbbs.service` with hardening (`ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`, `NoNewPrivileges`, etc.)
  - `install.sh` — idempotent installer: creates `kinbridge` system user, downloads + verifies upstream 1.1.15 release zip, lays down binaries + units + config.
  - `uninstall.sh` — clean removal; `--purge` flag also removes data + user.
  - `hbbs.env.example` — `RELAY_HOST` config.
- `deploy/docker-compose.yml` + `.env.example` — alternative Docker host deploy, not used on Olares.
- `deploy/README.md` — explains deployment choices and why k3s-on-Olares is a dead end for our port pattern.
- `.gitignore` entries for `deploy/.env`, `deploy/data/`, `deploy/logs/`, signing keystore.

### Investigated and abandoned
- Kubernetes manifest (`deploy/k8s/`, removed). Olares' `sandbox-inject-webhook.bytetrade.io` rejects `hostNetwork: true` and its reconciler auto-deletes user-created NetworkPolicies, blocking external ingress on custom TCP ports.

### Deployed
- 2026-04-18 — `rustdesk-server` v1.1.15 running on Olares at `192.168.68.54` via systemd.
- Server public key captured into `kinbridge-client/config/SERVER_PUBLIC_KEY.txt`.

### Upstream sync base
- Forked from `rustdesk/rustdesk-server@master` on 2026-04-18.
