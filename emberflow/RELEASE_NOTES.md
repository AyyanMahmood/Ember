# EmberFlow v1.0.0 Release Notes

**Release date:** 2026-08-04
**Status:** Code-complete and production-stable. See "What this release does *not* claim" below before flipping real money on.

---

## What EmberFlow v1.0.0 is

A finance operating system for freelancers and small agencies: clients, invoices, proposals, payment tracking, analytics, and Pro subscription billing, in one workspace. Free tier covers the essentials (5 invoices/month, 10 clients, 3 templates); Pro ($11/mo or $130/yr) unlocks unlimited usage, proposals, analytics, payment tracking, and full branding.

## Highlights of this release

- **The full customer journey lives inside the app.** Checkout, plan switching (Monthly ↔ Yearly), cancel, and resume all happen in-app via Polar's API — Polar's hosted portal is only used for card entry and the invoice archive.
- **A founder-decided, simple refund policy:** full refund within 7 days of any charge, identical for both plans, published at `/refund`.
- **A hardened document pipeline.** 17 invoice/proposal templates, one shared live-preview/export engine, with this release closing a stored-XSS gap and a broken-logo-image gap that could otherwise reach a client-facing PDF.
- **A closed loop of billing-bypass fixes.** Every Pro-gated write (templates, payment tracking, `past_due` proposal access) now has a server-side backstop, not just a UI-level gate.
- **Account deletion**, atomic and complete, including active-subscription cancellation — closing what was previously the one real compliance gap for a product holding client PII.
- **A UX audit and fix pass**, done from a first-time-customer's perspective across the entire app: all findings classified Critical/High were fixed and verified this release, including a light-theme contrast bug that made the EmberFlow wordmark unreadable across the marketing site and every auth page.

## What changed since the last internal milestone

See `CHANGELOG.md` for the itemized list. In brief: the 19-file security/correctness hardening batch from the final pre-launch audit is now committed and deployed (it had been built and verified but sat uncommitted); the refund policy was rewritten per founder decision; and a follow-on product/UX audit found and fixed 10 further issues (5 Critical, 5 High) plus the two remaining items classified as launch-blocking in a subsequent triage.

## What this release does *not* claim

This is the honest part, and it matters for a product that touches real money:

- **No real Polar transaction has been run.** Checkout, upgrade, downgrade, switch, cancel, resume, and refund are all code-complete, logic-verified (`verify:polar`, 33/33), and — for the parts observable from the database — show real evidence of working (166 processed webhook events, 4 real accounts currently on active Pro plans with correctly-synced Polar ids). But no one has completed an actual card transaction against this exact codebase to close the loop end-to-end.
- **Polar/Vercel production configuration has not been independently confirmed** in this release cycle (org token scope, webhook secret, selected webhook events, `POLAR_SERVER`/`APP_URL` values). This has been a standing gate since the original Paddle→Polar migration, not a new gap.
- **The Supabase Reset Password email template's live content is unconfirmed** — the code-side fix (token-hash verification) is in place and correct, but whether the dashboard template embeds `{{ .TokenHash }}` cannot be checked without dashboard access.

None of the above are code defects. They are the specific, small set of external/configuration steps between "code-complete" and "real-money launch," and they're the same ones this project has tracked since mid-project. See `KNOWN_LIMITATIONS.md` for the complete, current list — nothing padded, nothing hidden.

## Recommended next step before real-money launch

Run the live Polar sandbox-then-production end-to-end test this project has deferred since the original migration (`LAUNCH_QA.md` has the full checklist), and confirm the Vercel/Polar dashboard configuration items above. Everything on the code side is ready for that test today.
