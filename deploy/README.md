# KinBridge Server — Deploy

Two supported ways to deploy the signaling + relay stack.

## → Native systemd (recommended, and what we run)

**Use this** on the Olares host and any plain Ubuntu/Debian box. It drops two binaries + two systemd units and owns no shared infrastructure — no Docker, no Kubernetes, no container runtime concerns.

See **[`systemd/README.md`](systemd/README.md)**.

## → Docker Compose (alternative)

Useful if you're deploying on a host where Docker is the native way to run things and Olares' k3s restrictions don't apply. Not what runs in production today.

```bash
cp .env.example .env
# Edit RELAY_HOST in .env
docker compose up -d
```

## Why not Kubernetes?

We tried. Olares runs on k3s + Calico and injects an admission webhook (`sandbox-inject-webhook.bytetrade.io`) that:
1. Denies `hostNetwork: true` outright.
2. Auto-creates a default-deny NetworkPolicy in every namespace that only allows intra-namespace ingress.
3. Deletes user-created NetworkPolicies that would open ingress to external CIDRs.

That combination makes it impossible to expose raw TCP ports like RustDesk's 21115–21119 via k3s on Olares. Native systemd runs on the Ubuntu underlay, next to k3s, and is unaffected.

## Ports the stack expects

| Port | Proto | Service | Purpose |
|---|---|---|---|
| 21115 | TCP | hbbs | ID service |
| 21116 | TCP+UDP | hbbs | Rendezvous (signaling) |
| 21117 | TCP | hbbr | Relay |
| 21118 | TCP | hbbs | Web API / WebSocket |
| 21119 | TCP | hbbr | Relay (web) |
