# KinBridge API

Thin Node.js service that bridges the Lovable dashboard (`www.kinbridge.support`) to the on-box Headscale control plane and the RustDesk-derived relay stack running on Olares. Lives at **`api.kinbridge.support`**, fronted by Cloudflare Tunnel.

## What it is (and isn't)

**Is:**
- A REST surface the Lovable Worker calls with a shared service token.
- A minter of short-lived `kinbridge_token` JWTs and Headscale pre-auth keys.
- A WebSocket fan-out of runtime events back to the dashboard.

**Isn't:**
- An auth provider (Supabase owns user auth; we verify, we don't issue user JWTs).
- A database of record for sessions / devices / users (Supabase owns that).
- A video / screen / file relay (that's hbbs + hbbr + the RustDesk core).

## Endpoints (stubs today, real impls land in Week 2)

```
POST   /api/auth/exchange         { supabase_jwt } -> { kinbridge_token }
POST   /api/sessions/start        { dashboard_session_id, device_id, helper_id, owner_id } -> { session_id, connect_url }
POST   /api/sessions/:id/end      -> { session_id, ended_at }
POST   /api/devices/:id/heartbeat { device_id, at? } -> 204
POST   /api/help-requests         { device_id, session_id?, message? } -> 202
WS     /ws/events?token=<kb-jwt>  device.online | device.offline | help.requested | session.started | session.ended
GET    /api/version
GET    /api/health
```

All POST endpoints except `/api/auth/exchange` require `X-KinBridge-Service-Token` (checked with constant-time compare). Rate-limited globally by IP.

## Local dev

```bash
cd kinbridge-api
cp .env.example .env
# Fill in KINBRIDGE_SERVICE_TOKEN, KINBRIDGE_JWT_SECRET (openssl rand -hex 32 each),
# SUPABASE_URL + SUPABASE_JWKS_URL, HEADSCALE_URL + HEADSCALE_API_KEY.
npm install
npm run dev
```

## Deploy (Week 1c)

- Lives at `/opt/kinbridge-api/` on Olares, owned by a `kinbridge-api` system user.
- Systemd unit `kinbridge-api.service` in `deploy/systemd/` (same pattern as hbbs/hbbr).
- Fronted by `cloudflared` tunnel: `api.kinbridge.support` → `127.0.0.1:3000`.
- No port forwarding on the router; all inbound traffic comes through Cloudflare.

## Security commitments

- **Strict env validation**: Zod schema fails the process at boot on any missing or malformed env var.
- **Redacted logs**: `pino` redact list covers every header / field that might carry auth material.
- **Constant-time token compare**: service-token check uses `timingSafeEqual`.
- **Short JWT TTLs**: `KINBRIDGE_JWT_TTL_SECONDS` defaults to 120s. This token is a click-to-connect bearer, not a login credential.
- **Input validation at every boundary**: every request body is parsed with Zod, unknown fields rejected.
- **Ephemeral Headscale keys**: every minted pre-auth key is single-use + expires in 10 min.
- **Rate-limited**: global + per-IP buckets; easy to tighten per endpoint.
- **No CORS**: service is only called by the Lovable Worker and the KinBridge client; browsers are blocked by default.
- **Helmet**: security headers on by default.
- **AGPL-3.0**: modifications of the RustDesk stack include this service. Source at `github.com/sitothewild/kinbridge-client`; see `SECURITY.md` + `THREAT_MODEL.md` in the repo root.

See `../SECURITY.md` and `../THREAT_MODEL.md` for the full story.
