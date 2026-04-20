# KinBridge Legal — Privacy Policy and Terms of Service

Draft legal documents for KinBridge Support. Not published yet.

## Files

- [`PRIVACY.md`](./PRIVACY.md) — Privacy Policy (GDPR + CCPA aware,
  Play Console Data Safety mapping at the bottom).
- [`TERMS.md`](./TERMS.md) — Terms of Service (Acceptable Use Policy
  section worth showing to Play reviewers separately).

## Status

> **Drafts — not yet reviewed by a lawyer.**
>
> These were written to match the actual KinBridge architecture
> (sub-processors, retention, permission scope, RLS posture) so
> technical claims are correct. Legal language is boilerplate that
> needs a jurisdictional pass before go-live.

## Before publishing

1. **Fill the `{{PLACEHOLDERS}}`** in both files. Full list at the
   bottom of `TERMS.md`. You can do this as a search-and-replace.

2. **Have a lawyer skim them** — at minimum a paid flat-fee review if
   you're not retaining counsel. Things to flag:
   - Minimum age (13 with parental consent vs. 18 flat)
   - Arbitration clause (we left it out; consider adding for US)
   - Limitation-of-liability cap (currently $100)
   - Governing law / venue (we placeholder'd — requires your input)
   - Any DPA / SCC language required by EU customers you anticipate

3. **Publish at:**
   - `https://kinbridge.support/privacy` (Lovable dashboard)
   - `https://kinbridge.support/terms`
   - Link both from the app's Settings → About
   - Paste the Privacy URL into Play Console (Main store listing →
     Privacy policy URL, required).

4. **Update the app's Settings → About** to link to both URLs +
   display the "Last updated" dates.

## Play Console Data Safety form

The bottom section of `PRIVACY.md` ("Play Store Data Safety mapping")
is formatted to mirror Google Play's form. Walk through it row by
row when filling the Data Safety questionnaire in Play Console.

Specific reviewer-friendly claims you can point at:

- **MediaProjection justification.** See `PRIVACY.md` §1.5.
- **Accessibility Service justification.** Same section.
- **No ads, no tracking, no analytics.** §1.4 and §2.
- **Source available for AGPL compliance.** §9 of `TERMS.md`.

## Updating these docs

When you change sub-processors, retention, permissions, or anything
user-visible in the data flow, update both files + bump the
"Last updated" date. Email affected users 30 days ahead of any
material change (this is what §11 of the Privacy Policy promises).

## Related docs

- [`../../THREAT_MODEL.md`](../../THREAT_MODEL.md) — referenced from the Privacy Policy's §9 Security.
- [`../../SECURITY.md`](../../SECURITY.md) — CIS / Lynis audit record, referenced same.
