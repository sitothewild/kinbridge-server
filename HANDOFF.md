# KinBridge — Handoff

**Status snapshot, last updated when the previous Claude Code session ran out of context.** Read this + `CHANGELOG.md` + `THREAT_MODEL.md` + `SECURITY.md` to orient quickly.

## Repo map

| Repo | Role | Latest commit |
|---|---|---|
| [`sitothewild/kinbridge-server`](https://github.com/sitothewild/kinbridge-server) | Server deploy (hbbs/hbbr systemd), kinbridge-api (Node/Fastify), Headscale config, Cloudflare Tunnel config, security docs | `a4206e7` + `ddddd58` |
| [`sitothewild/kinbridge-client`](https://github.com/sitothewild/kinbridge-client) | Rebranded RustDesk fork — Flutter UI, Rust core, Android shell | `0940b19fd` |

## What's live on Olares (192.168.68.54)

| Service | systemd unit | Listens | Purpose |
|---|---|---|---|
| hbbs | `kinbridge-hbbs.service` | `*:21115`, `*:21116` TCP+UDP, `*:21118` | Rendezvous / signaling |
| hbbr | `kinbridge-hbbr.service` | `*:21117`, `*:21119` | Relay |
| Headscale | `headscale.service` | `127.0.0.1:8080` | Self-hosted Tailscale control plane |
| kinbridge-api | `kinbridge-api.service` | `127.0.0.1:3000` | Fastify REST + WS bridge to Lovable |
| cloudflared | `cloudflared.service` | outbound to CF edge | Tunnel for `api.kinbridge.dev` |
| fail2ban | `fail2ban.service` | (sshd jail) | Brute-force protection |

## Public surface

- **Dashboard:** `https://www.kinbridge.support/` — Lovable-hosted, on Lovable's DNS at name.com. **Do not touch nameservers** — moving them breaks Lovable's auto-SSL provisioning.
- **API:** `https://api.kinbridge.dev/api/*` — Cloudflare Tunnel → Olares. TLS by Cloudflare. Bot Fight Mode + Security Level disabled at the zone (required — CF's browser challenges break API clients).
- **Everything else** (RustDesk ports, Headscale, internal API): LAN-only / loopback-only. Never port-forwarded.

## Lovable Worker secrets (already handed over)

```
KINBRIDGE_API_BASE_URL=https://api.kinbridge.dev
KINBRIDGE_SERVICE_TOKEN=cdb09cbf1a8dd8084ec2af77ea1cde88ea47733941d43dd8d0d92d1eb013c752
```

## Toolchain locations (Wilson's PC2)

- Repos: `D:\KinBridge\kinbridge-server\`, `D:\KinBridge\kinbridge-client\`
- WSL2 Ubuntu 22.04 for all Android builds — distro name `Ubuntu-22.04`
- Windows-side Android SDK / NDK / Flutter: `D:\KinBridge\toolchain\`
- WSL toolchain: `/opt/toolchain/` (Flutter + Android SDK + vcpkg + Rust via rustup in `/root/.cargo`)
- Build artifact target: `/opt/kinbridge-build/target/` (kept off /mnt/d for speed)
- Brand SVGs: `D:\KinBridge\kinbridge-client\res\brand\`
- Lovable integration docs (read-only mirror, fetched via `gh`): `D:\KinBridge\lovable-docs\` — `SUPABASE_SCHEMA.md`, `SERVER_FUNCTIONS.md`, `README.md` from [`sitothewild/kinbridgesupport`](https://github.com/sitothewild/kinbridgesupport)
- Emulators:
  - **`kinbridge_pixel9`** — 1440×3120 @ 560dpi, 2GB RAM, GPU host, Android 14 Play Store image. Primary dev target (Pixel 7 Pro device profile — closest to Pixel 9 Pro available in the local toolchain).
  - **`kinbridge_fold`** — 1768×2208 @ 420dpi with hinge sensor (0–180°, 3 postures), for Fold 7 / Fold 8 Wide class testing.
  - `kinbridge_play` (legacy, 320×640 @ 96MB RAM — **do not use**; kept only for parity-regression checks).

## Android app status

APK type: **debug, unsigned**, arm64-v8a. Installs on emulator, not on real Android 13+ tablets without signing (Play Protect blocks).

- **Package:** `com.kinbridge.support`
- **App name:** `KinBridge Support`
- **Baked server:** `192.168.68.54` (Olares LAN IP) + Ed25519 key `WqooDze2t33XwECZ7swZG+2xAk7JL0b9rGqj3I4vzcw=`. This will be replaced by a Tailscale IP once libtailscale is embedded in the APK (see Week-2 note below).
- **Screens live today** (all smoke-tested on `kinbridge_play` emulator):
  - Onboarding: Welcome → Role Picker → Connect Code → Notifications (spec pp4-6)
  - Owner Home: greeting + "Need a hand?" amber card + Recent Helpers + Activity (spec p7) — **repo-backed** (FakeKBRepository)
  - Helper Home: family tiles + recent sessions — **repo-backed**, taps navigate into Live Session overlay
  - **Live Session overlay** (spec p9): E2EE eyebrow, "Helping X · Live · 00:12" header, Tap/Draw/Type/Voice chips, chat panel with composer, red End button + confirmation modal. Remote-view surface is a placeholder container — Phase IV-b wires the RustDesk `FlutterRemoteViewPage` into that slot.
  - **History** (spec p11): sessions grouped by Today / Yesterday / This week / Earlier, pull-to-refresh, tap-through to detail.
  - **Session Detail** (spec p12): peer hero card + tabbed Timeline · Chat · Notes + share/export icon. All tabs hydrate from `KBRepository.instance`.
  - Bottom nav: Home · Devices · History · Settings (**Devices** remains placeholder)

## Architecture notes

- **Data layer** (`lib/kinbridge/data/`):
  - `kb_models.dart` — view-model DTOs (KBSession, KBSessionEvent, KBChatMessage, KBHelper, KBDevice). Event enum values mirror Postgres `session_event_type` via `.wireName` / `.fromWire`.
  - `kb_repository.dart` — abstract `KBRepository` + `FakeKBRepository` (demo seed).
  - `kb_supabase.dart` — Supabase client singleton, PKCE configured, `anon key` baked (publishable). Auth-state listener **rebinds `KBRepository.instance`** automatically: signed-in → `SupabaseKBRepository`, signed-out → `FakeKBRepository`. Nothing calls the flip explicitly — auth is source of truth.
  - `kb_supabase_repository.dart` — PostgREST reads scoped by RLS (sessions + joined devices/profiles, session_events, chat_messages, device_pairings, devices). Derives `peerName` / `direction` / `online` client-side.
  - `kb_server_fn.dart` — HTTP wrapper for every TanStack `createServerFn` documented in `android-snippets/SERVER_FUNCTIONS.md` (pairing, session lifecycle, dashboard, MFA, KinBridge agent bridge). `{"data": …}` body envelope + `Authorization: Bearer <supabase access token>`. TOTP sentinel surfaced via `KBServerFnError.isTotpRequired`.
  - `kb_realtime.dart` — Supabase Realtime helpers: `chatStream(sid)`, `eventsStream(sid)`, `sessionLifecycleStream(sid)` plus `kbSendChat(sid, body)` that inserts directly into `chat_messages` (RLS gates it).
  - `tailnet_service.dart` — `KBTailnet` abstract + `NoopTailnetService` stub; real libtailscale embed is multi-day work.
- **Auth UX:** `SignInPage` (email/password, visibility toggle, friendly error mapping). Successful sign-in queries `user_roles` → maps to `KBRole.owner` / `KBRole.helper` → advances to Notifications prefs → Home. Previously the "Sign in" link on Welcome was a dead-end that went to Role Picker; fixed this session.
- **LiveSessionPage:** takes optional `sessionId`. When provided, hydrates from `KBRepository.instance.listChat` + subscribes via `KBRealtime.chatStream`, and the send button inserts via `kbSendChat`. When null (current default), renders a static demo conversation (pre-Lovable integration mode). End button fires `KBServerFn.endSession` when the sessionId is set.
- **Deep link:** `kinbridge://session/<id>?token=<jwt>` intent-filter in `AndroidManifest.xml`; `lib/kinbridge/session/kb_deep_link.dart` dispatches to `LiveSessionPage`. Wired into `common.dart::handleUriLink` as a pre-check (RustDesk's `rustdesk://` pipeline untouched). Cold-boot pending-link drained from `KBShell.initState` via `KBDeepLink.drainPending()`.
- **Fold compat:** `android:resizeableActivity="true"` on `MainActivity`. Existing `configChanges` already covers `screenLayout|screenSize|smallestScreenSize|density|uiMode` so fold/unfold doesn't recreate the activity.
- **Client-side trust circle (CVE-2026-30784 mitigation):** `src/server/kinbridge_trust.rs` gates LoginRequest at the top of `on_message`. File at `<Config::path()>/kinbridge_whitelist.json` controls behavior — default `mode: "off"` preserves RustDesk parity; flip to `"strict"` with populated `ids` to reject all non-trusted controllers. 5-second cache TTL so manual edits take effect without restart. Unit tests at the bottom of the module.

## kinbridge-api surface (Fastify)

| Path | Auth | Who calls it |
|---|---|---|
| `POST /api/sessions/start` | `X-KinBridge-Service-Token` | Lovable dashboard (via `startKinBridgeSession` server fn) |
| `POST /api/sessions/:id/end` | service token | dashboard |
| `POST /api/devices/:id/heartbeat` | service token | dashboard (stub — supabase write TODO) |
| `POST /api/help-requests` | service token | dashboard (stub — Lovable forward TODO) |
| `POST /api/auth/exchange` | none | **deprecated** — Supabase PKCE supersedes this; keep stub for backward-compat |
| `WS /ws/events?token=<kbtoken>` | kinbridge_token | dashboard realtime |
| **`POST /v1/sessions/:id/resolve`** | `Authorization: Bearer <kinbridge_token>` | **Android APK** (`DeepLinkActivity` — added this session). Verifies token, checks `sid` matches URL, returns `{session_id, relay_host, relay_port, rendezvous_token, ice_servers, device_fingerprint}` for RustCore handoff. |

New env vars on the API for `/v1/sessions/:id/resolve`:

```
KINBRIDGE_RELAY_HOST=192.168.68.54          # hostname/IP the agent dials
KINBRIDGE_RELAY_PORT=21117                  # hbbr TCP
KINBRIDGE_RELAY_PUBKEY=<base64 ed25519>     # from /var/lib/kinbridge/data/id_ed25519.pub
KINBRIDGE_STUN_URLS=stun:stun.l.google.com:19302
```

## What's NOT done (in priority order)

1. **Waiting on Lovable** — Add Device + Invite-a-Helper + QuickConnect flows + `kinbridge://auth-callback` PKCE OAuth path. Confirmed building on their side. Once their pieces land in `sitothewild/kinbridgesupport`, mirror in Flutter (pair-by-code UI, device registration UX, one-shot QuickConnect code handler).
2. **Phase IV-b — Live remote view.** Swap the placeholder `_RemoteViewSurface` container in `live_session_page.dart` for the RustDesk `FlutterRemoteViewPage` (wire via `session_add` + `session_start` from the resolved relay config in `/v1/sessions/:id/resolve`).
3. **Helper Home → real session start.** When user is signed-in AND has an approved pairing, tapping "Help now" should call `KBServerFn.startSession(deviceId:)` and navigate `LiveSessionPage(sessionId: …)`. Today it always goes to demo mode. One-liner once real pairings exist in the DB.
4. **Session Detail realtime.** Timeline + Chat tabs currently re-fetch on tab enter; add realtime subscriptions (already have `chatStream` / `eventsStream` helpers) for live sessions viewed via history.
5. **Release keystore + Play Internal Testing.** Blocks real-tablet install; unblocks public beta. Sensitive-permission review (MediaProjection + Accessibility) needs the "About you" developer statement (draft exists, awaiting Wilson's answers).
6. **libtailscale embed.** AAR drop + JNI + `AndroidTailnetService` swap. Multi-day. Until this lands, real deployments still use LAN IP / baked relay host.
7. **Whitelist seeding.** Lovable's dashboard needs to write `kinbridge_whitelist.json` on the daughter's device during pairing approval, and flip `mode` to `"strict"`. Until then the Rust-side gate is a no-op (but safe).
8. **Devices tab (bottom nav).** Currently placeholder. Implement: list paired devices (already queryable via repo), show last-seen, "Revoke" action → `KBServerFn.updatePairingStatus(status: 'revoked')`.
9. **Pay down API stubs.** `devices.ts` heartbeat → Supabase write, `help-requests.ts` → deprecate in favor of direct Supabase INSERT on `session_events`, `auth-exchange.ts` → deprecate (Supabase PKCE supersedes).
10. **Security Posture Report** — promised end of Week 3. OWASP Mobile Top 10 / ASVS L2 / CIS mapping + MobSF + OWASP ZAP + pen-test checklist.
4. **Release keystore + signed APK + CI.** Keystore never existed yet; debug builds only. Needed before Play Internal Testing or install on daughter's real tablet.
5. **Fill in the TODO(week2) stubs in `kinbridge-api/`:**
   - `src/routes/sessions.ts` — POST `/api/sessions/:id/end` currently only logs; needs to notify the connected WS client.
   - `src/routes/devices.ts` — heartbeat currently only logs; needs to write `devices.last_seen` to Supabase.
   - `src/routes/help-requests.ts` — currently returns 202; needs to actually call Lovable's `requestHelp` server fn.
   - `src/lib/headscale.ts` — ACL generation per-device (tag-based) needs to be wired to actual Headscale ACL endpoints, not just the preauthkey endpoint.
6. **Security Posture Report** — promised at end of Week 3. Control-by-control mapping vs OWASP Mobile Top 10, ASVS L2, CIS Ubuntu 22.04 Benchmark; MobSF scan results; OWASP ZAP results; pen-test checklist.

## In-flight when context ran out

- Phase V-b landed: bare `supabase` Dart SDK + auth shell + real `SupabaseKBRepository` reads via RLS + `KBServerFn` HTTP client for writes + `KBRealtime` streams for chat/events/session-lifecycle + email/password `SignInPage` that rebinds the repository on auth. APK build green on both `kinbridge_pixel9` (1440×3120) and `kinbridge_fold` (1768×2208 with hinge) AVDs.
- All uncommitted on kinbridge-client and kinbridge-server; commit when Wilson reviews.
- Next concrete work (unsupervised-safe):
  - Mirror Lovable's Add Device + QuickConnect + invite flow once they land in `kinbridgesupport`.
  - Wire Helper Home "Help now" → `KBServerFn.startSession` for real when a test account with an approved pairing exists.
  - Replace the LiveSessionPage placeholder remote-view surface with RustDesk's `FlutterRemoteViewPage` (Phase IV-b).

## Known quirks / gotchas

- **RustDesk sources have CRLF** because Git's default `autocrlf=true` on Windows. Every fresh checkout on a new machine: run `find . -name '*.sh' | xargs dos2unix` before building. The portfile patches for vcpkg (ffmpeg, libvpx, opus, mfx-dispatch) already handle this at extraction time.
- **vcpkg pinned to `120deac3...`**, not the original `6f29f12e...` in the plan. RustDesk only uses the older pin for armv7-android; arm64 builds fail version-resolution on the older vcpkg.
- **Fastify v5** wants `loggerInstance`, not `logger`, for a pre-built pino instance. Also `req.routeOptions.url`, not `req.routerPath`.
- **Flutter 3.24 Color.withOpacity** works; Color.withValues is 3.27+. Our pinned Flutter is 3.24.5 — do not use `withValues`.
- **Every KinBridge screen that uses a Material widget (IconButton, Switch, etc.) must be rooted in `Material`, not `Container`,** or Flutter throws "No Material widget found."
- **KB text styles must set `decoration: TextDecoration.none`** or Flutter draws a debug yellow underline outside a Scaffold tree.
- **Emulator is `kinbridge_play` (x86_64 Play Store image)** — it has Google's ARM translation. The plain `google_apis` x86_64 image does NOT, so an arm64 APK crashes there with missing `libc++_shared.so`. Don't switch AVDs.

## Good one-liners for the next session

```bash
# Sanity: full stack alive?
curl -sS https://api.kinbridge.dev/api/health                                     # expects "ok"
ssh olares 'systemctl is-active kinbridge-hbbs kinbridge-hbbr headscale kinbridge-api cloudflared'

# Rebuild client APK (post-Dart change)
wsl -d Ubuntu-22.04 -u root -- bash -c 'source /mnt/d/KinBridge/toolchain/wsl-env.sh && cd /mnt/d/KinBridge/kinbridge-client/flutter && flutter build apk --debug --target-platform android-arm64 --split-per-abi'

# Emulator install + fresh launch
/d/KinBridge/toolchain/android-sdk/platform-tools/adb.exe shell pm clear com.kinbridge.support
/d/KinBridge/toolchain/android-sdk/platform-tools/adb.exe install -r /d/KinBridge/kinbridge-client/flutter/build/app/outputs/flutter-apk/app-arm64-v8a-debug.apk
/d/KinBridge/toolchain/android-sdk/platform-tools/adb.exe shell monkey -p com.kinbridge.support -c android.intent.category.LAUNCHER 1
```
