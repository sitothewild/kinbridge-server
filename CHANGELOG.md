# KinBridge Server — Changelog

All notable changes vs. upstream `rustdesk/rustdesk-server`.

## [Unreleased]

### Added
- `deploy/docker-compose.yml` — parameterized compose with named containers (`kinbridge-hbbs`, `kinbridge-hbbr`), explicit log volume mount for hbbs, env-driven relay hostname.
- `deploy/.env.example` — template for `RELAY_HOST`.
- `deploy/README.md` — self-host deploy instructions + key backup guidance.
- `.gitignore` entries for `deploy/.env`, `deploy/data/`, `deploy/logs/`, signing keystore, `key.properties`.

### Upstream sync base
- Forked from `rustdesk/rustdesk-server@master` on 2026-04-18.
