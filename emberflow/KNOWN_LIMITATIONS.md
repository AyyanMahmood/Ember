# Known Limitations — v1.0.0

Genuine, current limitations only. Nothing here is a code defect that breaks the customer journey — each item below is either an external verification step, a deliberately deferred hardening item, or a real (small) polish gap. When an item is resolved, remove it here and note the fix in `CHANGELOG.md`.

---

## Launch gate: external verification, not code

These are the only things standing between "code-complete" and "real-money launch." None require writing code.

1. **No real Polar transaction has ever been run against this codebase.** Checkout, upgrade, downgrade, plan switching, cancel, resume, and refund are logic-verified (`verify:polar`, 33/33) and show real supporting evidence in production (166 processed webhook events; 4 accounts currently on active Pro plans with correctly-synced Polar customer/subscription ids) — but no one has completed an actual end-to-end card transaction to close the loop. Run `LAUNCH_QA.md` against a Polar sandbox, then once in production with a real card.
2. **Polar production configuration is unconfirmed**: org access token scope (must include `subscriptions (write)` for in-app switch/cancel to work), the webhook endpoint's selected events and format, and the grace-period setting. Requires Polar dashboard access.
3. **Vercel production environment variables are unconfirmed**: `POLAR_SERVER` (must read `production`, not the legacy `POLAR_ENVIRONMENT` name), `POLAR_ACCESS_TOKEN` and both `POLAR_PRODUCT_PRO_*` ids (production, not sandbox), `POLAR_WEBHOOK_SECRET` (must match the production endpoint specifically), `APP_URL`/`VITE_APP_URL`. Requires Vercel dashboard access.
4. **The Supabase Reset Password email template's live content is unconfirmed.** The code-side fix (explicit `token_hash` verification, not an ambient session) is correct and in place; whether the dashboard template actually embeds `{{ .TokenHash }}` cannot be checked without Supabase dashboard access. Without it, the cross-device password-reset case falls back to same-browser-only behavior.

## Deliberately deferred (known, real, scoped for later)

5. **Checkout duplicate-subscription guard has a narrow race condition (TOCTOU).** Two genuinely concurrent first-time checkouts (two tabs, a double-click) could both pass the existing-subscription check before either completes, producing two Polar subscriptions while the database reflects only one. Low probability; closing it needs a short-lived idempotency key or a DB lock — new surface, not a same-release fix.
6. **No periodic Polar↔Supabase reconciliation job.** Switch and Cancel self-heal reactively (a stale `polar_subscription_id` that 404s collapses the account to Free instead of freezing at stale access), but an account that never touches Switch or Cancel and whose Polar subscription was deleted outside the app would stay stale indefinitely. A scheduled reconciliation job would close this.
7. **No webhook out-of-order guard.** Event processing is idempotent (safe to replay) but doesn't compare `modified_at` — a genuinely out-of-order redelivery of two *different* events could transiently apply stale state. No evidence this has happened.
8. **`proposal_items` has two overlapping sets of RLS policies** (one current, one legacy pre-`past_due` set) — harmless today since permissive policies OR together, but real cleanup debt.
9. **`react-router-dom` has an open, moderate-severity advisory** (open-redirect). Fixing it is a major-version bump with its own breaking-change surface, scoped separately.
10. **No live Lighthouse baseline has been run.** The static picture is good (lazy-loaded routes, split vendor chunks, self-hosted fonts) but performance/accessibility scores have not been measured on a real device.

## UX polish (from the first-time-customer product audit; none of these block launch)

All findings classified Critical or High were fixed in this release. The following Medium/Low items remain, triaged for v1.1 or later:

11. Dashboard/ClientDetail/InvoiceDetail replace the whole page (not a scoped banner) on a failed data fetch.
12. A minor layout shift on Dashboard/ClientDetail stat cards between the loading and loaded state.
13. Pricing/Upgrade/Subscription card grids skip a tablet-optimized layout, going straight from 3-column to 1-column at 920px.
14. Usage-meter cards stay at 2 columns on mobile instead of 1 (a CSS specificity bug).
15. Decorative external-link icons occasionally wrap onto their own line on the Terms/Privacy/Contact pages.
16. The dedicated `/features` page has its own shorter, hand-maintained feature list that has drifted from the homepage's list (missing a "Secure workspace" callout).
17. The proposal line-item editor doesn't show the same real-time "excluded" warning the invoice editor has for an incomplete row (still caught at submit time, not silently lost).
18. The Brand Studio color picker popover can render partially off-screen near a narrow viewport's right edge.
19. The mobile sidebar navigation drawer doesn't trap keyboard focus the way every other overlay in the app does.
20. Several minor accessibility gaps: missing `scope="col"` on table headers app-wide; color-swatch buttons announce a raw hex code instead of a descriptive label; the delete-account dialog briefly loses its accessible name during the deleting/success transition; loading spinners are wrapped in a redundant duplicate `aria-live` region on three pages.
21. A handful of narrow, low-frequency edge cases: a template-picker keyboard-navigation breakpoint mismatch (only affects a ~40px viewport range for keyboard-only users), a long business name silently clipping in one premium document theme, a locked template briefly flashing via a guessed URL before snapping back, and one page-size control using an inline style instead of the spacing token scale.

---

*This document reflects the state as of v1.0.0 (2026-08-04). See `V1.5_ROADMAP.md` for the broader post-launch plan and `SESSION_HISTORY.md` for full root-cause writeups behind any item above.*
