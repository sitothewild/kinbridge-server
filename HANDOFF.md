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
- Emulator: AVD `kinbridge_play` (Android 14 google_apis_playstore x86_64 — the ARM-translation image)

## Android app status

APK type: **debug, unsigned**, arm64-v8a. Installs on emulator, not on real Android 13+ tablets without signing (Play Protect blocks).

- **Package:** `com.kinbridge.support`
- **App name:** `KinBridge Support`
- **Baked server:** `192.168.68.54` (Olares LAN IP) + Ed25519 key `WqooDze2t33XwECZ7swZG+2xAk7JL0b9rGqj3I4vzcw=`. This will be replaced by a Tailscale IP once libtailscale is embedded in the APK (Week 2 infra).
- **Screens live today** (rendering, placeholder data):
  - Onboarding: Welcome → Role Picker → Connect Code → Notifications (spec pp4-6 + role split)
  - Owner Home: greeting + "Need a hand?" amber card + Recent Helpers + Activity (spec p7)
  - Helper Home: family tiles + recent sessions (no spec mockup; inferred)
  - Bottom nav: Home · Devices · History · Settings (Devices + History are placeholder)

## What's NOT done (in priority order)

1. **UI Phase IV — Live session overlay.** Wrap RustDesk's remote-view with KinBridge chrome per spec p9: "Helping Mom · Live · 00:12" header, Tap/Draw/Type/Voice chips, chat panel bottom, "End-to-end encrypted" eyebrow.
2. **UI Phase V — Supabase wiring.** Every placeholder (helpers, activity, sessions, devices) today is hardcoded. Add `supabase_flutter` package + point at Lovable's Supabase URL + read via RLS-scoped queries. Build History (spec p11) + Session Detail (spec p12) against the live `session_events` table.
3. **Week 2 infrastructure (the Tailscale embed + deep-link + whitelist):**
   - libtailscale FFI (Go→Rust→Flutter) so the APK joins the tailnet silently on launch. This is the hardest remaining piece — weeks of work.
   - `kinbridge://session/<id>?token=<jwt>` intent-filter in AndroidManifest + handler that calls `KinBridgeApi.resolveSession` and launches the RustDesk core.
   - Client-side whitelist enforcement in `src/server/connection.rs` — reject any controller pubkey not in the allow-list.
4. **Release keystore + signed APK + CI.** Keystore never existed yet; debug builds only. Needed before Play Internal Testing or install on daughter's real tablet.
5. **Fill in the TODO(week2) stubs in `kinbridge-api/`:**
   - `src/routes/sessions.ts` — POST `/api/sessions/:id/end` currently only logs; needs to notify the connected WS client.
   - `src/routes/devices.ts` — heartbeat currently only logs; needs to write `devices.last_seen` to Supabase.
   - `src/routes/help-requests.ts` — currently returns 202; needs to actually call Lovable's `requestHelp` server fn.
   - `src/lib/headscale.ts` — ACL generation per-device (tag-based) needs to be wired to actual Headscale ACL endpoints, not just the preauthkey endpoint.
6. **Security Posture Report** — promised at end of Week 3. Control-by-control mapping vs OWASP Mobile Top 10, ASVS L2, CIS Ubuntu 22.04 Benchmark; MobSF scan results; OWASP ZAP results; pen-test checklist.

## In-flight when context ran out

- Phase III onboarding committed + pushed. Shippable.
- Next action was to verify the full Welcome → Role → Code → Notifications → Home flow on the emulator (walked through it, confirmed all four screens render; only the emulator's `input text` didn't cleanly populate the 6-char code — a test quirk, not a real user issue).

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
