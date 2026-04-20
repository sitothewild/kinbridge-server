# KinBridge Support — Terms of Service

**Effective date:** {{EFFECTIVE_DATE}}
**Last updated:** {{EFFECTIVE_DATE}}

> **Draft status.** These Terms have been written for the current
> KinBridge Support architecture but have **not** been reviewed by a
> qualified lawyer. Before publishing at kinbridge.support/terms, they
> should be reviewed against your jurisdiction's requirements. Fill the
> `{{LIKE_THIS}}` placeholders before publishing.

---

## 1. Agreement to these Terms

These Terms of Service ("Terms") form a binding agreement between you
and {{LEGAL_NAME}} ("KinBridge", "we", "our"), the operator of the
KinBridge Support dashboard at [kinbridge.support](https://kinbridge.support)
and the KinBridge Support Android application (together, the "Service").

By creating an account, pairing a device, or using the Service, you
agree to these Terms and to our
[Privacy Policy](https://kinbridge.support/privacy).

If you do not agree, do not use the Service.

## 2. What KinBridge is

KinBridge lets a trusted family member — a "Helper" — see and interact
with another family member's Android device during an explicit,
consented session. It is designed for warm, everyday tech assistance
between kin: a son helping his mother with Wi-Fi, a daughter showing
her father how to attach a photo to an email.

KinBridge is **not**:

- A surveillance tool — every session requires the device owner's
  consent and shows a visible, ongoing indicator.
- A professional managed-service or enterprise remote-support
  platform.
- A replacement for emergency services. Do not rely on KinBridge if
  someone's life or safety is at risk; call your local emergency
  number.

## 3. Eligibility

To use KinBridge you must:

- Be at least **{{MINIMUM_AGE}} years old**.
- Have the legal authority to enter into these Terms on behalf of
  yourself (or, if using the Service for a minor in your care, on
  behalf of them).
- Not be barred from receiving software under the laws of the
  jurisdiction in which you reside.

If you are helping someone set up KinBridge on behalf of an elderly
relative or a minor who cannot consent independently, you represent
that you have the authority to register a device on their behalf.

## 4. Your account

### 4.1 Account creation

You provide an email address and password when you sign up. You are
responsible for:

- Keeping your password confidential.
- Enabling two-factor authentication (TOTP) — strongly recommended
  for accounts that own devices.
- Notifying us at {{CONTACT_EMAIL}} if you believe your account has
  been compromised.

### 4.2 One human per account

Do not share an account with another person or let someone else sign
in using your credentials. If more than one person in your family
needs to help, create separate accounts and pair them as separate
Helpers.

### 4.3 Suspension and termination

We may suspend or terminate your account if you:

- Violate these Terms or our Acceptable Use Policy (§5).
- Engage in activity that threatens the security of the Service or
  its users.
- Fail to respond to reasonable requests for verification.
- Are the subject of a valid legal order we must comply with.

You may terminate your account at any time from **Settings → Delete
account**. See our Privacy Policy for what happens to your data.

## 5. Acceptable use

When you use KinBridge, you agree not to:

- **Help without consent.** Start a session on a device whose owner
  hasn't explicitly approved the session.
- **Abuse the Accessibility or MediaProjection permissions.** Don't
  use a session to exfiltrate data, install malicious software, or
  interact with the device in a way the owner hasn't approved.
- **Impersonate others.** Don't pretend to be someone else — a family
  member, a support technician, or a KinBridge representative — to
  trick someone into approving a pairing or session.
- **Target vulnerable people for fraud.** KinBridge is not an "IRS
  agent" or "Microsoft tech support" tool. Using it to extract money,
  passwords, or personal data from vulnerable users is a serious
  violation and will result in permanent account termination and, if
  applicable, reporting to law enforcement.
- **Reverse-engineer or attack the Service** beyond what's permitted
  by our open-source license (see §10) or applicable law. We welcome
  good-faith security research — contact {{SECURITY_EMAIL}} first.
- **Scrape, resell, or redistribute** the Service or its user data.
- **Circumvent technical limits** like rate limits, pairing
  expirations, or trust-circle enforcement.
- **Use the Service to violate law** or the rights of others.

## 6. Sessions and consent

### 6.1 Every session is consented

A Helper cannot start a session on a device without the device
owner's explicit approval in the dashboard (with 2FA if enrolled).
Session start, approval, and end events are recorded and visible to
both parties in session history.

### 6.2 Owners may end at any time

The owner of a device can end a live session at any moment from their
device or dashboard. Ending a session immediately terminates screen
sharing and tap-through.

### 6.3 Audit trail

Every tap, scroll, screenshot, chat message, and note during a
session is recorded. Both the owner and the helper can review the
audit trail via **History** in the app or dashboard.

### 6.4 Revoking a helper

The owner can revoke a helper's pairing at any time from
**Settings → Helpers**. After revocation, the helper cannot start
future sessions. Past session history is retained per the Privacy
Policy.

## 7. Pricing and payment

The KinBridge Service is currently **free** for personal, family use.
If we introduce paid plans in the future, we will:

- Notify account holders by email at least 30 days in advance.
- Allow you to cancel before the paid features take effect.
- Continue to offer the core free tier for personal family use.

{{OPTIONAL_PRICING_LANGUAGE}}

## 8. Your content

You retain all rights to the content you create — your chat messages,
session notes, screenshots, and device names. By using the Service,
you grant us a limited license to store, transmit, and display this
content **only** as required to operate the Service for you.

We do not claim ownership of your content and we do not use it to
train machine-learning models.

## 9. Intellectual property

The KinBridge Support app is derived from
[RustDesk](https://github.com/rustdesk/rustdesk), licensed under
**AGPL-3.0**. Source code for our modified Android client is
published at
[github.com/sitothewild/kinbridge-client](https://github.com/sitothewild/kinbridge-client)
to comply with AGPL obligations.

The KinBridge name, the warm-hearth color palette, the "Fraunces +
Manrope" typographic system, and the KinBridge dashboard are the
property of {{LEGAL_NAME}}. Don't use them in a way that could
mislead users into thinking an unaffiliated product is ours.

## 10. Third-party services

The Service depends on third-party infrastructure (Supabase / Lovable
Cloud, Cloudflare, our relay host, Google Play). Their availability is
outside our control; we'll do our best to communicate outages but we
can't guarantee the underlying providers.

## 11. Disclaimers

The Service is provided **"as is" and "as available"**. To the fullest
extent permitted by law:

- We make no warranty that the Service will be uninterrupted,
  error-free, or completely secure.
- We make no warranty of fitness for any particular purpose beyond
  casual family tech assistance.
- Your use of the Service is at your sole risk.

If your jurisdiction does not allow the exclusion of implied
warranties, some of the above exclusions may not apply to you. Nothing
in these Terms removes rights you have under mandatory consumer
protection law.

## 12. Limitation of liability

To the maximum extent permitted by law, in no event will KinBridge,
its officers, contractors, or affiliates be liable for:

- Any indirect, incidental, special, consequential, or punitive
  damages.
- Loss of data, profits, goodwill, or business opportunity.
- Any damages exceeding, in aggregate, the greater of (a)
  **USD $100** or (b) the amount you paid us in the 12 months
  preceding the claim.

Some jurisdictions don't allow the limitation of certain damages;
those limits don't apply to you if they're inconsistent with local
law.

**What liability we don't limit** (can't, under most laws): death or
personal injury caused by our negligence, fraud, and anything else
that can't lawfully be excluded.

## 13. Indemnification

You agree to defend and hold harmless KinBridge against claims
arising from:

- Your violation of these Terms.
- Your misuse of a session (e.g. starting a session without consent,
  using the Service to commit fraud).
- Your content or the activities you perform during sessions you
  participate in.

## 14. Governing law and disputes

These Terms are governed by the laws of **{{GOVERNING_LAW_STATE}},
{{GOVERNING_LAW_COUNTRY}}**, without regard to conflict-of-law rules.

Any dispute arising out of or related to these Terms will be resolved
in the state or federal courts located in **{{VENUE_CITY}},
{{VENUE_STATE}}**, unless applicable consumer-protection law requires
otherwise for residents of your jurisdiction.

Nothing here prevents you from bringing a claim in a small-claims
court of competent jurisdiction if the claim qualifies.

## 15. Changes to these Terms

We may update these Terms. For material changes we will notify account
holders by email at least 30 days in advance. Continuing to use the
Service after the effective date of the change means you accept the
updated Terms; if you don't, stop using the Service and delete your
account.

Non-material edits (typos, clarifications) take effect immediately and
will be reflected in the "Last updated" date at the top.

## 16. Miscellaneous

- **Entire agreement.** These Terms plus the Privacy Policy form the
  entire agreement between us about the Service.
- **Severability.** If any provision is held unenforceable, the
  remaining provisions stay in effect.
- **No waiver.** Our not enforcing a right on one occasion doesn't
  waive that right later.
- **Assignment.** You may not transfer your rights under these Terms
  without our consent. We may transfer ours to a successor entity
  (subject to §4.4 of the Privacy Policy).
- **Notices.** We reach you at the email on your account; you reach us
  at {{CONTACT_EMAIL}} or by mail at the address on the first page.

## 17. Contact

Questions about these Terms:

**{{LEGAL_NAME}}**
{{MAILING_ADDRESS}}
{{CONTACT_EMAIL}}

---

## Placeholders to fill

Before publishing, search-and-replace these in both this file and
`PRIVACY.md`:

- `{{LEGAL_NAME}}` — your legal name or LLC name
- `{{MAILING_ADDRESS}}` — required for EU/UK visitors + Play Console
- `{{CONTACT_EMAIL}}` — e.g. `support@kinbridge.support`
- `{{PRIVACY_EMAIL_OR_SAME_AS_CONTACT}}` — `privacy@...` or just reuse
- `{{SECURITY_EMAIL}}` — e.g. `security@kinbridge.support`
- `{{EFFECTIVE_DATE}}` — ISO date when you publish, e.g. `2026-05-01`
- `{{MINIMUM_AGE}}` — recommend `13` (with parent/guardian) or `18`
- `{{PAIRING_CODE_TTL}}` — currently `2` (matches connection_codes TTL)
- `{{SESSION_RETENTION_MONTHS}}` — recommend `12` unless you have a
  reason to go shorter (privacy-friendly) or longer (compliance)
- `{{IP_LOG_RETENTION_DAYS}}` — recommend `30`
- `{{SUPABASE_REGION}}` — pull from your Lovable Cloud project
  settings (likely `us-east-1` or similar)
- `{{RELAY_HOST_PROVIDER}}` — e.g. `Olares self-hosted` or
  the name of your VPS provider if you migrate
- `{{RELAY_HOST_LOCATION}}` — e.g. `United States`
- `{{INFRASTRUCTURE_REGION}}` — e.g. `the United States`
- `{{OPTIONAL_PRICING_LANGUAGE}}` — delete or replace with your actual
  paid-tier terms when you add one
- `{{GOVERNING_LAW_STATE}}`, `{{GOVERNING_LAW_COUNTRY}}` — e.g.
  `California, United States`
- `{{VENUE_CITY}}`, `{{VENUE_STATE}}` — your county / state
- `{{SECURITY_REVIEW_DATE}}` — when you plan to do the MASVS review
