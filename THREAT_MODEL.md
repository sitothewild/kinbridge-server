# KinBridge Support — Threat Model

**Status:** Living document. Update whenever a new feature changes the attack surface or a new abuse scenario is surfaced.

**Scope:** Server (rendezvous + relay on Olares), Phase 2 API (api.kinbridge.support), Lovable dashboard (www.kinbridge.support), KinBridge Android/desktop client (fork of RustDesk).

**Relationship to other docs:**
- `SECURITY.md` — audit record + hardening applied, mapped against CIS/ASVS controls.
- `CHANGELOG.md` — what changed vs upstream RustDesk.
- Lovable's internal docs cover dashboard-side auth + RLS.

---

## 1. Assets we protect (ranked by damage-on-compromise)

1. **Live control of a paired device's screen + input.** Highest. A compromised session = attacker can do anything the device's user can do, including drain bank apps, read messages, install malware.
2. **Session audit trail (session_events, chat_messages).** Contains screenshots, keystrokes, annotations, notes — privacy-sensitive even after the session ends.
3. **Pairing codes + auth tokens** (connection_codes, Headscale auth keys, kinbridge_token JWTs). Compromise of any → can join the trust circle.
4. **Server private key** (`id_ed25519` on Olares). Compromise → attacker can impersonate the server, MITM all sessions.
5. **APK signing keystore.** Compromise → attacker can ship malicious updates that users' devices auto-install.
6. **Supabase service-role credentials.** Compromise → full read/write on dashboard DB bypassing RLS.
7. **Headscale admin key.** Compromise → can mint arbitrary tailnet auth keys.
8. **Account credentials** (owner Supabase account, TOTP seed). Compromise → can initiate sessions and approve pairings.

## 2. Threat actors

| Actor | Capabilities | Motivation |
|---|---|---|
| **Opportunistic scanner** | Internet-wide port scans, known-CVE exploitation | Spam, crypto mining, ransomware staging |
| **Targeted external attacker** | Reverse-engineers APK, extracts pubkey, attempts social engineering | Stalking, identity theft, revenge (ex-partner scenario) |
| **Social engineer against end user** | Phone call / text to daughter pretending to be Dad or "tech support" | Convince her to share pairing code or tap approve |
| **Compromised helper account** | Owner's own credentials stolen (phishing, password reuse) | Abuse legitimate access |
| **Malicious helper (insider)** | Approved paired device, user-level trust | Privacy violation, coercion |
| **Upstream supply-chain attacker** | Compromise of vcpkg / cargo / npm dependency, or RustDesk upstream | Code execution in our APK at scale |
| **Physical attacker** | Brief physical access to daughter's unlocked tablet or Wilson's unlocked PC | Install rogue helper, read audit trail |
| **State actor / law enforcement** | Legal process, network interception, endpoint exploitation | Out of threat model for v1 — we are not a surveillance-resistant product |

## 3. Attack scenarios + which layer catches each

### S1. "Stranger ran an old APK off a forum"
Attacker extracts pubkey + server address from a leaked APK, runs it from a random IP.
- **Layer 1 — Tailnet.** Attacker is not on our Headscale tailnet → cannot reach hbbs at all. **Stopped.**
- No further layers needed.

### S2. "Stranger also has a leaked Headscale auth key"
Attacker gets a pairing-flow auth key that was sent to a legitimate user.
- **Layer 1 — Tailnet:** attacker now reaches hbbs. **Not stopped.**
- **Layer 2 — hbbs CVE-2026-30784:** attacker can register an ID and enumerate. **Not stopped.**
- **Layer 3 — Owner approval gate in Lovable:** any new session requires explicit owner approval in the dashboard. Attacker can't create a session even if they're on the tailnet. **Stopped here.**
- **Layer 4 — Client-side whitelist:** even if S3 bypasses L3 somehow, daughter's tablet rejects connect requests from pubkeys outside its allow-list. **Double-stopped.**
- **Mitigation:** auth keys are single-use, 5-min TTL, minted only via our API after TOTP-approved pairing. Compromise window is small.

### S3. "Attacker gets valid owner Supabase credentials"
Phished Wilson's email + password.
- **Layer 1 — TOTP MFA on owner:** required before approving any pairing or high-privilege action. **Stopped.**
- **Residual:** if TOTP seed also stolen, attacker has full owner. Mitigation: rate-limit sensitive actions, email Wilson on any approval-level event.
- **Kill switch:** "Emergency stop all sessions" in dashboard revokes every tailnet key and kicks every connection.

### S4. "Daughter convinced to share pairing code"
Social engineer calls her, "Hi sweetie, Dad asked me to help, can you read me the 6-digit code on screen?"
- **Layer 1 — Code TTL:** code expires in 5 minutes. **Partial mitigation.**
- **Layer 2 — Owner TOTP approval:** attacker who redeems the code still can't proceed without Wilson approving the pairing in the dashboard (TOTP-gated). **Stopped.**
- **Layer 3 — UX:** tablet home screen never displays "share this code with anyone." Only the owner generates and uses codes via the dashboard. Daughter rarely sees codes at all.

### S5. "Malicious insider approved helper (ex-partner abusing custody access)"
Trusted helper pairing becomes untrusted.
- **Detection:** dashboard shows every session location, duration, audit trail. Owner can review.
- **Response:** revoke pairing in dashboard → Headscale expires their auth key → whitelist removes their pubkey → future sessions blocked. **No cleanup of past snooping possible** — residual risk, inherent to any remote-access tool.

### S6. "APK signing keystore leaked"
Attacker ships a malicious update signed with our key.
- **Layer 1 — Distribution channel:** if on Play Internal Testing, Google's review catches obvious malware. **Partial.**
- **Layer 2 — Reproducible builds + SBOM:** we publish the build recipe and hashes for every release. A vigilant user or the Lovable dashboard can verify. **Partial, requires vigilance.**
- **Mitigation plan:** keystore stored in 1Password with 2FA; backup in offline encrypted storage; `SECURITY.md` has rotation plan documented. Compromise is catastrophic but detectable.

### S7. "Supply-chain compromise of an npm or cargo dependency"
Classic `event-stream` / `left-pad` / `xz` scenario.
- **Layer 1 — Version pinning:** `Cargo.lock` + `package-lock.json` committed. `cargo audit` + `npm audit` run in CI; dependabot enabled.
- **Layer 2 — Minimal dependencies:** Phase 2 API keeps the tree small (Fastify + jose + pino + zod). Every new dep reviewed.
- **Layer 3 — Build-time sandboxing:** CI runs in ephemeral containers; build outputs hash-verified.
- **Residual:** 0-day in a trusted dep (xz-style). No perfect defense. Fast response via `SECURITY.md` disclosure channel.

### S8. "Daughter's tablet stolen and unlocked"
Physical attacker has the device in hand with no lockscreen.
- **Layer 1 — Android full-disk encryption:** standard Samsung Knox. **Partial.**
- **Layer 2 — KinBridge requires lockscreen pin before showing session history or approving pairings** (planned, Week 3).
- **Layer 3 — Remote revoke:** Wilson can revoke the tablet's pairing + expire its Headscale key remotely from the dashboard. Next time device comes online, it's neutralized.
- **Residual:** brief physical-access window is inherent to mobile devices.

### S9. "RustDesk upstream ships a malicious commit we sync"
We pull from `rustdesk/rustdesk` periodically via `sync-upstream.sh`.
- **Layer 1 — Manual review of every upstream merge.** `UPSTREAM_CONFLICTS.md` tracks what changed; diff is reviewed before build.
- **Layer 2 — Our own CI builds must pass** on every sync.
- **Layer 3 — Release keystore signs only after manual approval.**
- **Residual:** subtle backdoor in a large diff could slip review. Defense: keep upstream syncs small and frequent rather than quarterly dumps.

### S10. "Attacker breaches Olares host"
Via unpatched OS, compromised service, physical access to the box.
- **Layer 1 — host hardening:** Lynis pass, fail2ban, SSH key-only (pending), unattended-upgrades, firewall (pending).
- **Layer 2 — service isolation:** `hbbs`/`hbbr` run as unprivileged `kinbridge` user with systemd hardening (ProtectSystem=strict, etc.). Phase 2 API same pattern.
- **Layer 3 — minimal blast radius:** Headscale admin key on separate systemd user; Supabase service-role key only in Phase 2 API env; server Ed25519 private key 600-permed.
- **Residual:** root on Olares → full compromise of our stack. Mitigation: monitoring (journalctl alerts on sudo / SSH failures), offline backups of id_ed25519 + keystore so we can rebuild.

### S11. "Owner loses phone (TOTP device) and email simultaneously"
Account lockout scenario.
- **Response plan:** emergency recovery via SSH to Olares (still accessible via kinbridge SSH key on Wilson's PC), documented in `RUNBOOKS.md` (pending, Week 3). Can reset owner password directly in Supabase service-role client and re-enroll TOTP.
- **Residual:** if Olares key + TOTP + email all lost, no recovery. Same as losing a password manager — documented as catastrophic risk.

---

## 4. Controls summary (cross-reference)

| Control | Enforces | Primary scenarios covered |
|---|---|---|
| Headscale tailnet | Network-level isolation | S1, S2 (partial) |
| Auth-key single-use + 5 min TTL | Limit compromise window | S2 |
| Pairing code TTL + hash at rest | Credential hygiene | S4 |
| Owner TOTP MFA | Identity assurance | S3, S4 |
| Session approval in dashboard | Consent gate | S2, S4 |
| Client-side whitelist (Rust core) | Last-line consent | S2, S5 (ongoing) |
| Persistent session-active notification | User awareness | S5, S8 |
| Volume-key panic end | User-initiated kill | S5, S8 |
| Emergency stop in dashboard | Admin kill | S3, S5 |
| Immutable audit log | Forensics + accountability | S5, S10 |
| fail2ban + rate limits | Brute-force mitigation | S10, future S2 variants |
| Unattended-upgrades + Lynis | Host hygiene | S10 |
| Cargo/npm audit + dependabot | Supply chain | S7, S9 |
| Reproducible builds + SBOM (planned) | Supply chain + distribution | S6, S7 |
| Tailscale expire + whitelist revoke | Incident response | Every scenario — containment |

## 5. Residual risks accepted for v1

1. **S5 (malicious approved helper)** — inherent to remote access. Owner discretion required; dashboard audit exists but doesn't prevent a trusted party from abusing access.
2. **S6 (keystore leak)** — depends on Wilson's operational security for the keystore file. Mitigation is procedural (password manager + offline backup) not technical.
3. **S7 0-day dep** — impossible to eliminate; we rely on fast response.
4. **State-actor adversary** — out of scope for v1. We are a family product, not a surveillance-hardened one.
5. **Physical-access theft of an unlocked device** — Android OS-level problem, not ours to fully solve.

## 6. When to revisit

Update this doc when:
- A new feature changes who can initiate or approve a session.
- A new integration is added (e.g. billing provider, SMS gateway, Play Store listing).
- A new asset type enters the system (e.g. video recording, file transfer, remote install).
- A real incident occurs — document what happened, what the existing controls did, what new control we added.
- A new dependency with network access is added.

Every PR that changes auth, pairing, session lifecycle, or any privileged path must reference which section of this doc it affects.
