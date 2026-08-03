# Changelog

All notable changes to EmberFlow are documented in this file. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] — 2026-08-04

First production-stable release. EmberFlow is a freelancer finance operating system: client management, invoicing, proposals, payment tracking, analytics, and Pro subscription billing, on Supabase + Vercel + Polar.

### Added

- **Client management** — profiles, contact data, notes, billing history, per-plan client limits.
- **Invoice generation** — itemized invoices with tax, discounts, status tracking, 17 visual templates (3 free, 14 Pro), PDF/Print/HTML/Markdown/JSON/CSV/TXT/DOCX export via a shared live-preview document studio.
- **Proposal generation** — template-driven proposals with scope, timeline, and pricing, same document studio and export paths as invoices.
- **Payment tracking** — manual payment records, invoice balance reconciliation, overdue monitoring.
- **Analytics** — revenue totals, monthly collections, overdue tracking, top-client rankings.
- **Dashboard** — at-a-glance metrics, recent invoices, quick actions.
- **Brand Studio** — logo, brand color, and font customization applied consistently across every generated document (free-tier color customization; full branding on Pro).
- **Authentication** — email/password with password reset, Google OAuth (production-verified), disposable-email detection, password strength meter, resend-verification flow, in-app password change.
- **Account deletion** — Settings → Danger Zone: atomic, server-side deletion of every row and file a user owns, including active-subscription cancellation, via a dedicated `delete_user_account()` RPC (migration `012`).
- **Billing (Polar, Merchant of Record)**:
  - Checkout for Monthly ($11/mo) and Yearly ($130/yr) plans, with duplicate-subscription prevention.
  - In-app plan switching (Monthly ↔ Yearly) via Polar's native subscription-update API — no portal redirect, one subscription always.
  - In-app cancel (`cancel_at_period_end`) and resume, no portal redirect.
  - Checkout plan selection persists through auth (register/login/OAuth) so a chosen plan is never asked for twice.
  - In-app billing summary (plan, renewal date, last/next payment) with a link out to Polar's invoice archive.
  - Signed, idempotent webhook processing for all `subscription.*` events.
  - `past_due` dunning nudge (proactive, app-wide) and a post-revoke "resubscribe" message for failed payments; `past_due` accounts keep full Pro access while Polar retries, matching the documented policy.
  - Config-driven plan catalog (`config/plans.js` + `api/_utils/planCatalog.js`) — adding a future plan requires no scattered edits.
  - **7-day refund window**, identical for Monthly and Yearly, founder-decided policy published at `/refund` and mirrored in-app.
- **Design system** — dark-first token system with an explicit light-theme opt-in, BEM component CSS, a contextual loader family (no skeleton screens, by deliberate policy), Apple-style Pro-activation celebration, logo-anchored app entrance.
- **Ember UI** — 8 extracted, documented, reusable components (`alert`, `animated-number`, `item-row`, `loaders`, `modal-dialog`, `progress-bar`, `progress-ring`, `segmented-control`) plus the `polar-billing` backend module, versioned at `~/Desktop/Ember UI/`.
- **SEO** — full favicon/manifest set, real Open Graph image, sitemap, `robots.txt` with explicit AI-crawler allowances, JSON-LD structured data sourced only from real product data.

### Fixed (final hardening pass before this release)

- Stored-XSS via unescaped invoice number/proposal title in Print/Export-HTML paths; SVG logo uploads (stored-XSS vector on public Storage URLs) — closed client- and server-side.
- Free-tier billing bypasses: premium invoice templates reachable via a guessable `?template=` URL param; `create_invoice_with_items()` not persisting the chosen template on create for any user; payment tracking with no DB-level Pro gate; `past_due` incorrectly excluded from proposal update/delete access.
- Checkout's duplicate-subscription guard failing open on a transient DB read error.
- Password-reset auth bypass: any already-logged-in browser could reach the "set a new password" form with zero re-authentication.
- Brand Studio false "Pro required" error when a Free user saved only their brand color.
- Billing-portal "customer does not exist" for sandbox-era accounts (post-production-cutover self-heal).
- Stale-subscription self-heal in Switch/Cancel: a `polar_subscription_id` that 404s against Polar now collapses the account to Free with a clear message instead of freezing at stale Pro access.
- Dead-end error states with no retry action (Analytics, Invoices, Proposals, Templates); Subscriptions could show "you're on Free" during a load error to an actual paying customer.
- **"EmberFlow" wordmark unreadable in light theme** on the marketing header/footer and every auth page (shared `.brand-mark` class was hardcoded to a sidebar-only color token).
- **Post-upgrade "Welcome to EmberFlow Pro" celebration illegible in light theme** (same class of bug — theme-aware text color on an intentionally-always-dark background).
- Global error-recovery button (`ErrorBoundary`) referenced CSS classes that didn't exist, rendering as an unstyled browser-default button.
- A failed PDF export on the Proposals list wiped the entire loaded list instead of showing a scoped error.
- Analytics silently summed invoices across different currencies into one mislabeled total.
- "Rows per page" control on Clients/Invoices tables was wired to a callback neither page passed through — visibly did nothing.
- Deleting a client with linked invoices surfaced a raw Postgres foreign-key error instead of an actionable message.
- Invoice/proposal document logos had no fallback for a broken/stale/CORS-blocked image — showed a broken-image icon on client-facing exports instead of the initials placeholder.
- `Button`'s loading state discarded its label text, showing an unlabeled spinner during Switch/Cancel/Resume/Upgrade (which poll for several seconds).
- Six pages (Proposals, Analytics, Templates, Invoices, InvoiceDetail, InvoiceForm) replaced the entire page with a bare spinner while loading, discarding the header — reworked to keep static page chrome mounted and scope the spinner to content, per this project's own loading-state rule.
- Literal `&amp;` rendering as visible broken text in Terms/Privacy Policy section headings.
- Ambiguous "prorate" wording on the Subscriptions page (used in two different senses — switching vs. cancelling — with no disambiguation).

### Changed

- Refund policy replaced: was discretionary-only ("non-refundable except billing errors/duplicates/outage"); now a flat 7-day full-refund window for both Monthly and Yearly, founder-decided, documented at `/refund` and in `SUPPORT_PLAYBOOK.md`.
- Payment provider migrated Paddle → Polar (Merchant of Record), completed 2026-07-28.
- Microsoft OAuth removed from V1 scope (button, provider logic, and docs fully removed).

### Security

- Row-level security verified enabled on every user-data table (`invoices`, `payments`, `proposals`, `proposal_items`, `subscriptions`, `webhook_events`, `profiles`) — confirmed directly against the production database for this release.
- Signed, idempotent Polar webhook verification (Standard Webhooks HMAC, 5-minute tolerance, delivery-id dedup) — unchanged and re-verified this release.

---

*Dated session-by-session engineering history — root causes, migration decisions, and per-commit rationale — lives in `SESSION_HISTORY.md`. This file is the release-level summary.*
