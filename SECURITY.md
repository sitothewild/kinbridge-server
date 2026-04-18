# KinBridge Server — Security Audit + Hardening

Audit run 2026-04-18 against the live deploy on Olares (192.168.68.54) running `rustdesk-server` v1.1.15 under systemd.

## Known upstream CVE affecting us

### CVE-2026-30784 — Missing Authorization in hbbs/hbbr
- **Affects:** `rustdesk-server` (OSS) through v1.1.15 — what we run.
- **Disclosed:** 2026-03-05.
- **Fix from upstream:** None. OSS line is effectively in maintenance mode; RustDesk steers new deployments at the paid Server Pro product.
- **Impact:** hbbs and hbbr enforce zero authorization on connection requests. Any client that knows the server's Ed25519 public key (which we must ship in every KinBridge client binary) can register any device ID on our server, enumerate online peers, and initiate connection attempts to any peer. No session tokens, no auth negotiation.
- **Our mitigation posture:**
  1. **Not internet-exposed.** External probe confirms ports 21115–21119 are not forwarded from the WAN router (both Shodan InternetDB and hairpin-NAT probe from Olares' public IP returned closed). Attack surface is LAN + any device reachable via Tailscale.
  2. **Planned:** Phase 3 KinBridge client enforces an allow-list of trusted controller device IDs/pubkeys; the daughter's tablet will refuse all inbound connection requests from non-whitelisted IDs. This doesn't stop abuse of hbbs' registration, but blocks actual session establishment against the only high-risk device.
  3. **Tracking upstream:** monitor `rustdesk/rustdesk-server` for a real fix. If the OSS line stays dark and we ever expose the server publicly, evaluate self-patching hbbs to require a signed session token from our Lovable API.

## Hardening applied 2026-04-18

| Area | Before | After |
|---|---|---|
| `id_ed25519` file mode | 0644 (world-readable) | **0600**, owner `kinbridge:kinbridge` |
| `db_v2.sqlite3*` file mode | 0644 | **0600** |
| Installer (`deploy/systemd/install.sh`) | Left perms at hbbs default | Post-start chmod pass to fix them on fresh installs |
| SSH brute-force protection | none | **fail2ban** installed + `sshd` jail active (5 retries / 10 min → 1 h ban) |
| OS security patches | 19 pending CVEs | All pending security updates from `noble-security` applied (`libssl3t64`, `openssl`, `libpam*`, `libgnutls30t64`, `libtasn1-6`, `python3-jwt`, `polkitd`, `linux-firmware`, `linux-libc-dev`, `tzdata`, `vim`) |

## External exposure — verified LAN-only

Probed from outside the LAN:
- `https://internetdb.shodan.io/74.102.236.35` → 404 (no Shodan records).
- WebFetch `http://74.102.236.35:21118/` → ECONNREFUSED (router not forwarding).
- Hairpin TCP probe on 21115–21119, 22, 6443 from Olares' own public IP → all closed.

Conclusion: the KinBridge stack is reachable only from inside the LAN. If you ever add port forwarding to expose the server publicly, **re-run this audit first** — CVE-2026-30784 becomes actionable the moment 21115–21116 is WAN-reachable.

## Residual risks / non-remediated

| Item | Severity | Rationale for leaving |
|---|---|---|
| SSH password authentication still enabled on Olares | Medium | Fail2ban installed. Disabling password auth would require explicit confirmation and a verified fallback — keep for now. |
| `olares` user has `NOPASSWD` sudo | Low–Medium | Standard Olares default; tightening risks breaking Olares internals. |
| Kernel/polkit packages upgraded but not restarted | Low | Olares uses `policy-rc.d` to block auto-restart and runs initramfs on read-only media; takes effect on next reboot. |
| No HIDS (AIDE/rkhunter) | Low | Out of scope for a personal-LAN deploy; revisit if internet-exposed. |

## What was checked and cleared

- Systemd unit file perms (0644 root:root) ✅
- `hbbs.env` perms (0640 root:kinbridge) ✅
- SUID binaries outside containerd snapshots (none unexpected) ✅
- World-writable files outside `/var/lib/kubelet` (none) ✅
- Cron jobs — standard Ubuntu stock only ✅
- `.bash_history` for leaked secrets — none ✅
- Unexpected login-shell users — only `olares` ✅
- Public-IP port exposure — none ✅

## Re-run this audit

```bash
# From any machine with SSH access to the Olares box:
ssh olares 'sudo stat -c "%a %U:%G %n" /var/lib/kinbridge/data/*'
ssh olares 'sudo fail2ban-client status sshd'
ssh olares 'sudo apt list --upgradable 2>/dev/null | grep -i security'
curl -s https://internetdb.shodan.io/$(ssh olares 'curl -s https://ifconfig.me')
```
