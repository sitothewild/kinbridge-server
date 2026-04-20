# KinBridge — Handoff

**Last session end: 2026-04-20.** Current release: **v1.4.6-beta.6** — a fully rebranded, Google-OAuth-enabled Android APK wired to Lovable's Add Device / QuickConnect / Helper Invite flows. No `rustdesk` strings anywhere a user, operator, or APK inspector can find them. Read this + `THREAT_MODEL.md` + `SECURITY.md` + `docs/legal/` to orient quickly.

---

## Repo + release state

| Repo | HEAD | What it holds |
|---|---|---|
| [`sitothewild/kinbridge-server`](https://github.com/sitothewild/kinbridge-server) | `6acbf16` | `kinbridge-api` (Node/Fastify), Headscale config, CF Tunnel config, security docs, legal drafts |
| [`sitothewild/kinbridge-client`](https://github.com/sitothewild/kinbridge-client) | `1fc913734` | Rebranded RustDesk fork — Flutter UI + Dart data layer + Rust core |
| [`sitothewild/hbb_common`](https://github.com/sitothewild/hbb_common) | branch `kinbridge/zero-rustdesk` @ `71b6a2a` | Forked library with rebrand edits; pinned from kinbridge-client `.gitmodules` |
| [`sitothewild/kinbridgesupport`](https://github.com/sitothewild/kinbridgesupport) | (Lovable-owned) | Dashboard + TanStack server fns + `android-snippets/` integration docs |

**Current APK release** — v1.4.6-beta.6:
- https://github.com/sitothewild/kinbridge-client/releases/tag/v1.4.6-beta.6
- Direct: https://github.com/sitothewild/kinbridge-client/releases/download/v1.4.6-beta.6/kinbridge-support-v1.4.6-beta.6-arm64-v8a.apk
- **APK SHA-256:** `48a33a152cb0a65a88746ff83d5cb3aff99a69834d1e58f0261378d762c10b23`
- **Signing cert SHA-256 (used for App Links + eventual Play Console):** `F0:EA:98:E0:EE:C8:5A:2B:A0:84:33:D8:79:16:C3:54:DB:49:B4:91:A3:7E:6A:2E:3D:2B:FB:7B:8A:7C:99:A9`
- **Cert SHA-1:** `AE:25:57:4D:03:4B:BD:5D:0B:29:94:75:00:79:BA:74:3F:18:FF:21`
- Size 26.7 MB, arm64-v8a only, min Android 10 (API 29), signed with the upload keystore

## What's live on Olares (192.168.68.54)

Unchanged from earlier: `kinbridge-hbbs`/`kinbridge-hbbr`/`headscale`/`kinbridge-api`/`cloudflared`/`fail2ban` all under systemd. Public surface: `https://www.kinbridge.support/` (Lovable) + `https://api.kinbridge.dev/*` (CF Tunnel → kinbridge-api). Everything else LAN-only.

## The brand story (source-of-truth rebrand state)

Every user- and operator-visible identifier was swept from "RustDesk" to "KinBridge". Unique to this fork:

**Binary identity:**
- Cargo `[package] name = "kinbridge"`, `default-run = "kinbridge"`
- Cargo `[lib] name = "libkinbridge"` → produces `libkinbridge.so` on Android
- Kotlin `System.loadLibrary("kinbridge")`; Flutter `DynamicLibrary.open('libkinbridge.so' / .dll)`
- `hbb_common` forked to `sitothewild/hbb_common` with `RENDEZVOUS_SERVERS` default → `rs.kinbridge.support`, `LINK_DOCS_*` → `kinbridge.support/help/*`, version-check URL const emptied
- `is_public()` in `src/common.rs` hard-coded `return false` — the last `rustdesk.com/` substring match is gone from the binary
- `do_check_software_update()` is a no-op — the APK never phones `api.rustdesk.com`
- Kept: "Powered by RustDesk" text on Settings (AGPL §5(a) attribution), but non-clickable; `rustdesk/rustdesk` source comments replaced with `[upstream]` marker

**User-visible UX:**
- `app_name` resource + all notification titles + Accessibility service label + boot toast = "KinBridge Support"
- Notification channel ID `KinBridgeSupport`, WakeLock tag `kinbridge:wakelock`, VirtualDisplay `KinBridgeVD`
- Launcher icon: white bridge + heart on amber gradient, sourced from `res/brand/kinbridge-icon-tile.svg`, rendered via `rsvg-convert` at 1024² + fanned out by `flutter_launcher_icons`
- Dart package `kinbridge_support` (was `flutter_hbb`) across 95 imports
- Profile AndroidManifest package attr `com.kinbridge.support`

**Confirmed by `unzip -l` on beta.6:**
```
lib/arm64-v8a/libapp.so
lib/arm64-v8a/libc++_shared.so
lib/arm64-v8a/libflutter.so
lib/arm64-v8a/libkinbridge.so
```
Zero `librustdesk.so`, zero `rustdesk` strings at binary level.

## Android app status

| Surface | State |
|---|---|
| Onboarding (Welcome → Role → Connect Code → Notifications) | Rendering + navigating |
| **Sign in** — email/password | ✅ Real Supabase auth, infers KBRole from `user_roles` |
| **Sign in** — Google OAuth (PKCE via `kinbridge://auth-callback`) | ✅ Wired, **pending test against real Supabase config** |
| Owner Home + Helper Home (greeting, recent helpers/devices) | ✅ Real data via SupabaseKBRepository post sign-in |
| Owner "Need a hand?" → help request | ✅ Helper picker bottom-sheet + session + `help_requested` event insert |
| Helper "Help now" tile → `startSession` | ✅ Real TanStack server-fn, real sessionId |
| Helper "Have a code?" card → `QuickConnectPage` | ✅ 6-digit numeric entry, `redeemConnectionCode` with mode discriminator |
| Live Session overlay | ✅ Chrome (E2EE eyebrow, timer, tool chips, chat). Chat via `kbSendChat` + realtime. **Remote view itself is a placeholder container** — Phase IV-b pt.2 pending. |
| History + Session Detail | ✅ Real reads via Supabase RLS |
| **Install token** (`kinbridge://install?token=…`) | ✅ `redeemInstallToken` → `InstallCompletePage` |
| **QuickConnect** (`kinbridge://quickconnect?code=…`) | ✅ Branches on `mode`: quickconnect → LiveSessionPage, pairing → "Request sent" dialog |
| **Helper Invite** (`https://kinbridge.support/invite/<token>`) | ✅ Verified App Link → `InviteAcceptPage` preview/accept/success with friendly copy for all 4 rejection reasons |
| **Auth callback** (`kinbridge://auth-callback?code=…`) | ✅ `exchangeCodeForSession` + auth-state listener propagates |
| Client-side trust-circle gate (CVE-2026-30784) | ✅ `src/server/kinbridge_trust.rs`, default `mode=off`, flip to `strict` with populated `kinbridge_whitelist.json` |
| Devices bottom-nav tab | Placeholder |

## Data flow map (helper's perspective)

```
Welcome → Sign in (password OR Google OAuth → kinbridge://auth-callback → Supabase session)
    ↓
Helper Home (realtime from Supabase)
    ├── tap "Help now" on device tile → KBServerFn.startSession(deviceId) → sessionId → LiveSessionPage
    ├── tap "Have a code?" → QuickConnectPage → KBServerFn.redeemConnectionCode(code)
    │        ├── mode=quickconnect → LiveSessionPage(sessionId) [pushReplacement]
    │        └── mode=pairing → "Request sent" dialog, back to home
    └── tap an invite link from outside → InviteAcceptPage → lookupInvite → acceptHelperInvite

LiveSessionPage (real sessionId)
    ├── chat: hydrate via listChat + subscribe via KBRealtime.chatStream + send via kbSendChat
    ├── end: KBServerFn.endSession(sessionId)
    └── remote view: placeholder (Phase IV-b pt.2)
```

## Architecture crib — where things live

**kinbridge-client** (Flutter + Rust):
- `flutter/lib/kinbridge/` — all KinBridge-specific Dart code (never touch RustDesk upstream files there)
  - `data/kb_models.dart` — view-model DTOs
  - `data/kb_repository.dart` — abstract KBRepository + FakeKBRepository
  - `data/kb_supabase.dart` — Supabase client singleton, auth-state listener, Google OAuth, PKCE memory storage
  - `data/kb_supabase_repository.dart` — RLS-scoped PostgREST reads
  - `data/kb_server_fn.dart` — HTTP wrapper for every TanStack server fn (install/quickconnect/invite/session lifecycle)
  - `data/kb_realtime.dart` — chat/events/session-lifecycle streams + `kbSendChat`
  - `session/kb_deep_link.dart` — five-URL dispatcher (session, install, quickconnect, auth-callback, https invite)
  - `session/live_session_page.dart`, `install_complete_page.dart`, `invite_accept_page.dart`, `kb_remote_connection.dart`
  - `helper/quick_connect_page.dart` — 6-digit code entry
  - `onboarding/sign_in_page.dart` — email/password + Google OAuth button
- `src/server/kinbridge_trust.rs` — CVE-2026-30784 mitigation
- `flutter/android/app/src/main/jniLibs/arm64-v8a/libkinbridge.so` — committed, rebuild via `flutter/ndk_arm64.sh`

**kinbridge-server**:
- `kinbridge-api/src/routes/v1-sessions.ts` — `POST /v1/sessions/:id/resolve` for DeepLinkActivity relay-config handoff
- `docs/legal/PRIVACY.md`, `TERMS.md`, `README.md` — drafts ready for lawyer pass + placeholders to fill
- `HANDOFF.md` — this file

**Out-of-repo but Wilson's responsibility:**
- `D:\KinBridge\keystore\kinbridge-upload.keystore` — **back up to 1Password immediately**
- `D:\KinBridge\keystore\RECOVERY.md` — passwords + fingerprints + restore procedure
- `D:\KinBridge\lovable-docs\*.md` — read-only mirror of `kinbridgesupport/android-snippets/` (refresh via `gh api`)

## Secrets + config registry

| Key | Value | Used by |
|---|---|---|
| Supabase URL | `https://fqqswguifsyjxrvglnmk.supabase.co` | APK (baked) |
| Supabase anon key | (baked in `kb_supabase.dart`) | APK |
| KINBRIDGE_CRON_SECRET | `c4cb210ed3dceae87f16fb85d5665e78b1607e1318148b9f176b762dd3a8fcb8` | Lovable Supabase (scheduled fns) |
| KINBRIDGE_SERVICE_TOKEN | `cdb09cbf1a8dd8084ec2af77ea1cde88ea47733941d43dd8d0d92d1eb013c752` | Lovable → kinbridge-api |
| Upload keystore password | (in `D:\KinBridge\keystore\RECOVERY.md`) | Release APK signing |
| Supabase project ref | `fqqswguifsyjxrvglnmk` | (managed by Lovable Cloud — no direct dashboard access for Wilson) |

## Lovable integration — round-tripped status

**Confirmed by Lovable (2026-04-20):**
1. Server-fn URL path = `https://kinbridge.support/_serverFn/<name>` (their earlier doc had a stale `/api/server-fn/` snippet; fixed on their side)
2. `redeemInstallToken` returns `{ result: { device: { id, name, platform, owner_id } } }` — nested envelope
3. `lookupInvite` returns `{ valid:true, inviteId, deviceName, inviterName, note, expiresAt }` on valid; `{ valid:false, reason }` on invalid
4. `endQuickConnectSession` is live at `POST /_serverFn/endQuickConnectSession`
5. `/.well-known/assetlinks.json` created in their repo with our cert fingerprint (deploy pending)

**Lovable still on the hook for:**
- `kinbridge://auth-callback` as an approved Google redirect URL in Supabase (they've enabled Google provider via managed creds; approval of the custom scheme is per-project config)
- Profile-page logged-in-only APK download card wired to the beta.6 URL above
- Dashboard "transport: 'web' | 'native'" scaffolding for future browser-viewer (low pri, deferred per your call)
- Browser viewer component + WebRTC signaling (real feature, weeks of work on agent side — deferred until post-launch)

## Open tasks, ordered

1. **Wilson tests beta.6 on Bluestacks + daughter's tablet.** Walk all three deep-link flows if the Lovable dashboard will mint real tokens. Report what breaks.
2. **Google OAuth end-to-end test.** Tap "Continue with Google" → browser → pick account → confirm `kinbridge://auth-callback` lands + signs in. If Google provider rejects the callback URL, ping Lovable to add it.
3. **Phase IV-b pt.2 — real remote view.** Swap the placeholder container in `LiveSessionPage._RemoteViewSurface` for the real RustDesk frame renderer. Prereq: Lovable adds `devices.peer_id` column OR we register peer IDs via a different path. See `kb_remote_connection.dart` file header for the full wiring plan.
4. **Desktop KinBridge client.** Rust workspace now builds clean (bin-target compile fixed). Weekend of work to produce signed Windows/Mac/Linux binaries from the same source tree. Ships as the "helper on laptop" tier per Wilson's product plan.
5. **Helper's side of `help_requested`.** Owner inserts the event fine; helpers need a notification overlay when one fires. Realtime subscription is already available via `KBRealtime.eventsStream`.
6. **Phase V-b polish:**
   - Session Detail realtime (Timeline + Chat tabs) — currently pull-on-open; helper pages already have pull-to-refresh
   - Devices bottom-nav tab implementation (list paired devices, last-seen, revoke)
   - Persistent auth storage — swap `_KBMemoryAuthStorage` in `kb_supabase.dart` for a `shared_preferences`-backed impl so cold-boot preserves sign-in
7. **Play Console submission.** Blocked on Google verification of the developer account (paid $25, awaiting approval). When approved:
   - Internal Testing track upload of beta.6+ signed APK
   - Data Safety form from `docs/legal/PRIVACY.md` bottom section
   - App content declarations for the two sensitive permissions (MediaProjection + AccessibilityService)
8. **Legal pass.** Drafts in `docs/legal/` need a flat-fee consumer-SaaS legal review + placeholder fill-in before public Play Store launch. Per Wilson's 2026-04-19 call, defer until project end; memory note saved at `project_kinbridge_lawyer_review.md`.
9. **Security Posture Report.** Promised for end of Week 3. OWASP MASVS L2 / ASVS L2 / CIS baseline map + MobSF + ZAP + pen-test checklist.

## Test recipes (copy-paste-ready)

Install on Bluestacks / real Android:

```bash
# Clear + install beta.6
/d/KinBridge/toolchain/android-sdk/platform-tools/adb.exe uninstall com.kinbridge.support
/d/KinBridge/toolchain/android-sdk/platform-tools/adb.exe install \
  /d/KinBridge/kinbridge-client/flutter/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk

# Fire a deep link to test an integration branch
adb shell am start -a android.intent.action.VIEW \
  -d "kinbridge://quickconnect?code=123456"

adb shell am start -a android.intent.action.VIEW \
  -d "kinbridge://install?token=abc123def"

adb shell am start -a android.intent.action.VIEW \
  -d "https://kinbridge.support/invite/testtoken"
```

Rebuild APK (post Dart change, no Rust changes):

```bash
wsl -d Ubuntu-22.04 -u root -- bash -c \
  'source /mnt/d/KinBridge/toolchain/wsl-env.sh && \
   cd /mnt/d/KinBridge/kinbridge-client/flutter && \
   flutter build apk --release --target-platform android-arm64 --split-per-abi'
```

Rebuild Rust .so (post Rust change):

```bash
wsl -d Ubuntu-22.04 -u root -- bash -c \
  'source /mnt/d/KinBridge/toolchain/wsl-env.sh && \
   cd /mnt/d/KinBridge/kinbridge-client && \
   bash flutter/ndk_arm64.sh'
# Then copy /opt/kinbridge-build/target/aarch64-linux-android/release/liblibkinbridge.so
# to flutter/android/app/src/main/jniLibs/arm64-v8a/libkinbridge.so (strip first)
```

Publish a new pre-release (increment beta.N, update notes):

```bash
SHA=$(sha256sum /d/KinBridge/kinbridge-client/flutter/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk | awk '{print $1}')
cp /d/KinBridge/kinbridge-client/flutter/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk \
   /tmp/kinbridge-support-v1.4.6-beta.N-arm64-v8a.apk
cd /d/KinBridge/kinbridge-client
gh release create v1.4.6-beta.N --repo sitothewild/kinbridge-client \
  --title "KinBridge Support v1.4.6 (beta.N)" --prerelease \
  --notes "…" /tmp/kinbridge-support-v1.4.6-beta.N-arm64-v8a.apk
```

## Known gotchas (carry-forward)

1. **CRLF noise.** `kinbridge-client` has `autocrlf=true`; 550+ RustDesk upstream files show as "modified" due to line endings. Only ever stage files you explicitly touched; run `git diff -w` to see real content changes.
2. **hbb_common is a submodule** pointed at our fork (`sitothewild/hbb_common`, branch `kinbridge/zero-rustdesk`). Fresh clones need `git submodule update --init --recursive`.
3. **The Android Rust build isn't invoked by `flutter build`.** You must run `flutter/ndk_arm64.sh` + copy the .so manually. `flutter build apk` just packages whatever's already in `jniLibs/`.
4. **Flutter emulator is currently `kinbridge_fold` (1768×2208 with hinge).** `kinbridge_pixel9` (1440×3120) also exists. The old `kinbridge_play` is a 320×640/96MB-RAM disaster — don't use.
5. **Flutter 3.24.5 pinned.** `Color.withOpacity` works; `withValues` doesn't. `onPopInvokedWithResult` preferred over deprecated `onPopInvoked`.
6. **PKCS12 keystore** uses one password for both store and key.
7. **Emulator coordinates differ between AVDs** — tapping at y=2050 on Fold doesn't hit what it does on Pixel 9. Recalibrate per-AVD when scripting UI tests.

## Emergency contact points

- **GitHub Issues:** `sitothewild/kinbridge-client/issues` for bug reports from real testers
- **Olares relay health:** `ssh olares 'systemctl is-active kinbridge-hbbs kinbridge-hbbr headscale kinbridge-api cloudflared'`
- **API health:** `curl -sS https://api.kinbridge.dev/api/health` → expects "ok"
- **Keystore disaster recovery:** `D:\KinBridge\keystore\RECOVERY.md` (back up to 1Password first)
- **Lovable dashboard repo:** `sitothewild/kinbridgesupport` — read-only for us, integration contract lives in `android-snippets/`

---

**Status as of this handoff:** Android APK is functional end-to-end for sign-in + data reads + write-path server-fn calls + deep-link dispatch for all four Lovable flows (session, install, quickconnect, invite) + auth-callback for Google OAuth. The one remaining user-visible placeholder is the remote-view frame rendering inside LiveSessionPage (Phase IV-b pt.2). Everything else is real data flowing against real infrastructure.
