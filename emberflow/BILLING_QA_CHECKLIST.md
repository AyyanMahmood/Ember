# Billing Lifecycle QA Checklist

**Status: NOT verified.** Produced during the 2026-07-30 Launch Hardening audit from code + Polar's own documentation (verified directly against `polarsource/polar-js` source and `polar.sh/docs`, not recalled from memory) — not from a live sandbox run. This environment has no Polar account/credentials, so nothing below has been exercised end-to-end. Work through it against a real Polar **sandbox** account before launch; see `POLAR_SETUP.md` for account/webhook setup.

For each item, check: does the UI show the right thing, does the `subscriptions` row match, and (where relevant) does Vercel's function log show what you'd expect. Note the exact failure if something doesn't match — "didn't work" isn't enough to act on.

---

## 1. First purchase

- [ ] Free → Monthly: checkout opens, sandbox test card succeeds, redirect lands on `/app/subscriptions?billing=success`
- [ ] Immediately on landing back: the page shows "Confirming your purchase with Polar…" (not the Upgrade-to-Pro card, not a bare "Free plan") if the webhook hasn't landed yet — this is the fix from `c56a104`, added specifically because Polar's docs confirm the subscription's status "might not be active yet" on the very first webhook event. Confirm this actually appears live at least once (it may be too fast to see if the webhook is very quick) rather than just trusting the isolated-harness verification done in this environment.
- [ ] The `?billing=success` param disappears from the URL bar shortly after landing (not left dangling if the page is reloaded/bookmarked)
- [ ] Within a few seconds of payment, `subscription.active` (or `.created`) webhook lands (check Polar dashboard → Webhooks → delivery log for `200`)
- [ ] `subscriptions` row: `plan='pro_monthly'`, `status='active'`, `polar_customer_id`/`polar_subscription_id`/`polar_product_id` all populated, `current_period_start`/`current_period_end` set, `cancel_at_period_end=false`
- [ ] The confirming banner disappears and the real Pro state renders within the ~16s bounded poll window; if it doesn't (webhook genuinely slow/stuck), confirm the page falls back to showing its real current state rather than hanging on "Confirming…" forever
- [ ] Pro features unlock in the UI without a manual refresh (Analytics, Proposals, Brand Studio logo/font/accent, unlimited invoices/clients)
- [ ] "Manage billing" button appears on `/app/subscriptions`
- [ ] Free → Yearly: repeat all of the above with the yearly product

## 2. Duplicate purchase

- [ ] While already Pro (active or `past_due`), call `/api/polar/checkout` again (e.g. re-click Upgrade, or hit the API directly) → `409` with the "you already have an active subscription" message, **no second Polar checkout session is created**
- [ ] Confirm in the Polar dashboard that only one subscription exists for the test customer after this
- [ ] **Known unverified edge case (not fixed this sprint, documented not guessed):** two rapid checkout requests from two different tabs/devices for the same *Free* user, close enough together that both read "no existing subscription" before either completes, could both succeed at Polar and create two subscriptions Polar would separately bill — EmberFlow's single `subscriptions` row would only ever reflect whichever webhook lands last, silently losing visibility of the other. Low probability (needs two concurrent sessions), not reproducible without real timing control — flag if you can force it.

## 3. Upgrade / cadence switch (Monthly ↔ Yearly)

**Corrected understanding of Polar's real capability (2026-07-30, superseding the note that used to be here — the old note overstated Polar's limitation and was fixed in `874b68c` after being found stated as fact in the app's own UI):** Polar has a real **Update Subscription API** (`product_id` + `proration_behavior`: `invoice`/`prorate`/`next_period`/`reset`, verified against `polar.sh/docs/api-reference/subscriptions/update-subscription`) that can move a subscription onto a different product with proration handled by Polar. Polar's Customer Portal also has a configurable self-serve "switch subscription plans" feature (`Settings → Customer portal` in the Polar dashboard). **EmberFlow does not use either of these** — it deliberately keeps Monthly and Yearly as separate products (confirmed this is Polar's own recommended design: "one product per pricing model," not a workaround) and requires cancel-then-resubscribe instead of an in-place swap, to avoid building custom proration UI/logic. This was a deliberate scope decision this sprint, not a technical limitation — do not describe it to users as something Polar can't do.

- [ ] **Checkout creation while already Pro** — `checkout.js`'s `409` guard fires (verified in code, see §2) — confirm live that clicking anything that would call `/api/polar/checkout` while Pro is actually unreachable from the UI (the "Switch billing cadence" card replaces the Upgrade card entirely once `isPro`) and that hitting the API directly still gets the `409`
- [ ] **Polar behavior** — confirm in the Polar dashboard whether "switch subscription plans" is enabled under Customer Portal settings for this org; if it is, a customer might see a plan-switch option inside Polar's own portal UI that bypasses EmberFlow's cancel-first flow entirely — if so, decide (as a follow-up, not this sprint) whether to disable it for consistency with EmberFlow's own messaging, or adopt it as the real mechanism instead
- [ ] **Database updates** — cancel Monthly (`cancel_at_period_end=true`, `status` stays `active`) → confirm `subscriptions` row reflects this immediately after the webhook; confirm a fresh Yearly checkout is still blocked (`409`) until the row's status actually leaves `hasAccessGrantingStatus` (i.e. until the period genuinely ends and `subscription.revoked` lands, not just because `cancel_at_period_end=true`)
- [ ] **Webhook sequence** — same `subscription.*` sequence as cancellation (this section doesn't introduce new event types since EmberFlow implements switching as cancel-then-purchase, not an in-place update) — see §5 and §1 for the two halves
- [ ] **Entitlement updates** — once the old subscription is genuinely `revoked`/free and the new Yearly checkout completes, confirm entitlements (`isPro`, invoice/client limits, Pro feature gates) reflect the new plan correctly, same mechanism as §1
- [ ] **UI state** — "Switch billing cadence" card copy (now corrected in `874b68c`) accurately describes cancel-then-resubscribe without claiming it's a Polar limitation
- [ ] **Duplicate subscription prevention** — confirm only one subscription ever exists in the Polar dashboard for the test customer throughout a full Monthly→(cancel)→Yearly cycle
- [ ] **Proration** — confirm EmberFlow does **not** attempt any proration math of its own (it shouldn't — there's nothing to prorate since the old plan's paid-for period runs out naturally before the new one starts; the customer isn't charged for or credited any overlap). If Polar's own portal-based switch (see above) ever gets enabled, its proration behavior would need separate verification.
- [ ] **Billing period changes** — confirm the new subscription's `current_period_start`/`current_period_end` are a fresh period from the new checkout date, not inherited from the old subscription

## 4. Downgrade

- [ ] Yearly → Monthly: same mechanism as #3 (cancel, then resubscribe) — verify the UI copy doesn't imply anything more automatic exists
- [ ] Monthly/Yearly → Free: this **is** cancellation (EmberFlow has no paid tier below Pro) — see section 5

## 5. Cancellation

**Full end-to-end audit performed 2026-07-30 — this section records what was verified with evidence (code + Polar's own docs) vs. what genuinely cannot be confirmed without a live account.**

### Webhook event sequence (as documented by Polar — exact ordering/timing is NOT published)

Verified directly against `polar.sh/docs` and the individual event reference pages:

| Action | Resulting `status` | `cancel_at_period_end` | Event(s) Polar's docs name for it |
|---|---|---|---|
| Cancel at period end (the default — portal or dashboard) | stays `active` | `true` | Docs say the subscription "stays active" with the flag set; docs do **not** specify whether this arrives as `subscription.updated`, `subscription.canceled`, or both — EmberFlow's endpoint has all three selected, so this is moot for correctness (see below) |
| Uncancel (undo before period end) | `active` | reverts to `false` | `subscription.uncanceled` |
| Revoke immediately | `canceled`, `ended_at` set | n/a (already ended) | `subscription.revoked` — its own doc text: "Happens when the subscription is canceled or payment retries are exhausted" |
| Cancel-at-period-end reaches `current_period_end` naturally | `canceled` | n/a | `subscription.revoked` (same event, confirmed by the doc text above covering both triggers) |

**Honest limitation:** Polar's public docs do not publish a formal state-machine/ordering guarantee for these events. This audit could not produce a byte-exact "verified sequence" beyond what's quoted above — that would need either private API docs or observing real deliveries.

**Why the exact order doesn't actually matter for correctness (verified by re-reading `webhook.js`/`normalizeSubscription` a second time, specifically hunting for an order-dependent bug):** every `subscription.*` event is processed identically — `normalizeSubscription(data, existing)` derives `plan`/`status`/`cancel_at_period_end` purely from that event's own payload, never by diffing against what came before. Two events arriving out of order, or concurrently (Vercel invocations can run in parallel), still converge to the same correct final state because each write is independently self-consistent, not incremental. No race condition found here on this closer, second pass.

### Database sync per event

- `subscriptions.plan`, `status`, `billing_cycle`, `cancel_at_period_end`, `current_period_start/end`, `polar_customer_id`/`polar_subscription_id`/`polar_product_id` — all written by the single `upsertSubscription()` path, `onConflict: 'user_id'` (safe, real unique index — confirmed in Phase 1)
- Duplicate/replayed events: safe — `webhook_events` idempotency check returns early with `{duplicate: true}` before any write
- [ ] Live-test: force a duplicate delivery (Polar dashboard → Webhooks → resend) and confirm no double-processing

### Entitlement logic — exact answers, not assumed

- **Does `cancel_at_period_end` still grant access?** Yes — confirmed both in code (`hasAccessGrantingStatus` checks `status`, never reads `cancel_at_period_end`) and in Polar's own docs ("stays active and the customer keeps their benefits — they paid for that period").
- **Which statuses grant access?** `active`, `trialing`, `past_due` (matches Polar's real 8-value status enum — `incomplete`/`incomplete_expired`/`trialing`/`active`/`past_due`/`canceled`/`unpaid`/`paused`, verified against `polar-js`'s `SubscriptionStatus` type). `past_due` grants access deliberately, mirroring Polar's own payment-retry grace period.
- **Which do not?** `canceled`, `unpaid`, `paused`, `incomplete`, `incomplete_expired` — all correctly excluded. `paused` was newly checked this pass (not considered in the Phase 1 audit) and is correctly excluded — consistent with how "pause" is meant to work (stop paying, stop access, keep the subscription record).
- **When should Pro disappear?** When `status` leaves the granting set above — i.e. on `subscription.revoked` (→ `canceled`) or exhausted payment retries (→ `unpaid`), never merely on `cancel_at_period_end=true`.

### Root cause of "sometimes doesn't immediately reflect" — investigated to the code's limit

Two real, distinct, now-fixed contributors, both frontend/API-side (not webhook processing, not the database, not entitlement logic — those were re-verified clean this pass):

1. **`useSubscription.js` only fetched once on mount** — fixed `5a12fa3` (Phase 1): now refetches on `pageshow` (bfcache restore) and `visibilitychange` (tab refocus).
2. **Polar's customer portal had no way back to EmberFlow at all** — `return_url` was never set on the customer-session request, and Polar's own docs confirm that without it "no back button appears" in the portal. Fixed `1b27012`: both portal.js code paths now set `return_url=/app/subscriptions`, giving users a real link (a plain fresh navigation, no bfcache ambiguity) in addition to the browser back button.

**What remains genuinely unverifiable from this environment (external config, not a code bug):** whether the Polar dashboard's webhook endpoint has exactly the documented event set selected. `POLAR_SETUP.md` documents 6 events (`created`/`active`/`updated`/`canceled`/`uncanceled`/`revoked`) — all three cancellation-relevant ones (`canceled`/`uncanceled`/`revoked`) are on that list, so event *selection* should not be the cause for cancellation specifically, assuming the live dashboard actually matches the doc. (Separately noted, not a cancellation-flow issue: Polar also has `subscription.past_due`, `subscription.paused`, `subscription.resumed`, and `subscription.cycled` events that aren't in EmberFlow's documented list at all — irrelevant to cancellation, relevant to Failed Payments/Renewals, flagged there instead of fixed here.)

- [ ] **Cancel from Polar customer portal**: confirm `cancel_at_period_end` flips to `true` in the `subscriptions` row (status stays `active`)
- [ ] Return to EmberFlow **via the new portal "back to EmberFlow" link** (from the `return_url` fix) → confirm it actually appears in the portal UI and lands cleanly on `/app/subscriptions` with correct state
- [ ] Return to EmberFlow **via the browser back button** (in case a user doesn't use the portal's own link) → confirm the `pageshow`/`visibilitychange` fix still covers this
- [ ] Return to EmberFlow via a **second tab** (portal opened in a new tab) → `visibilitychange` picks it up on refocus
- [ ] Wait for the period to actually end → `subscription.revoked` webhook lands → `plan` collapses to `'free'`, Pro features lock again
- [ ] **Cancel from EmberFlow's own dashboard**: the danger-zone action opens a confirm dialog, then redirects to the Polar portal to actually complete the cancellation — confirm this is what actually happens (EmberFlow has no direct cancel-via-API call of its own)
- [ ] Check Vercel's function logs for the `subscription.*` deliveries around a real cancel to see which event name(s) Polar actually sends in practice — the one thing this audit could reason about from docs but not observe directly

## 6. Renewals

**Full audit performed 2026-07-30. Conclusion: no code bug found — the system already handles renewals correctly. This was the single highest-stakes open question of the whole audit (see below) and it came back clean, verified against Polar's own explicit documentation, not assumed.**

### The one question that mattered most here

Polar has a dedicated `subscription.cycled` event, and its own docs state it "fires when the period rolls over, **before the renewal order exists and regardless of whether the renewal payment succeeds**." `subscription.cycled` is **not** in EmberFlow's configured webhook event list (`POLAR_SETUP.md` documents only `created`/`active`/`updated`/`canceled`/`uncanceled`/`revoked`). This raised a real possibility that EmberFlow might never learn about a successful renewal at all, leaving `current_period_end` stuck at the original period forever.

**Resolved, verified against Polar's own docs, quoted directly:** `subscription.updated` — "Sent when a subscription is updated. **This event fires for all changes to the subscription, including renewals.**" `subscription.updated` is already in EmberFlow's configured event list. `cycled` is a more specific, earlier, payment-outcome-agnostic signal Polar offers for consumers who want to react before the charge attempt; EmberFlow doesn't need it, because the generic `updated` event (which fires with the real post-attempt status and the new period dates) already covers renewal correctly under the same generic `subscription.*` handling every other event already goes through. **Not adding `subscription.cycled`** to the webhook endpoint — it isn't needed and would only add a payload whose `status` can't yet be trusted (fires before the charge is attempted).

### Verified, no bug found

- **Monthly renewal / Yearly renewal** — mechanically identical in `normalizeSubscription()`; neither is special-cased, both go through the same generic `subscription.updated` → upsert path.
- **`current_period_start`/`current_period_end` update correctly** — confirmed both from Polar's docs (renewal payload "carries the new `current_period_start` and `current_period_end`") and from re-reading `normalizeSubscription()`: it always prefers the new event's dates and only falls back to the existing row's dates if the new payload's are missing/invalid — so an update that doesn't carry period dates (e.g. a payment-method-only change) can't accidentally null them out, and one that does carry them always advances correctly.
- **Status during a successful renewal** — does not change (stays `active`); Polar's docs confirm the subscription "only moves to `past_due` if payment fails."
- **Customer object** — not modified by a normal renewal; the existing default payment method is charged. Nothing for EmberFlow to react to beyond the subscription fields it already tracks.
- **Renewal after `subscription.uncanceled`** — no special-casing needed or present: the next renewal's `subscription.updated` event carries its own `cancel_at_period_end: false`, which `normalizeSubscription()` applies directly from that event's payload, same as any other event.
- **Renewal after a previous payment retry recovered** (`past_due` → `active`) — same generic path; once status is back to `active`, subsequent renewals are indistinguishable from a subscription that was never `past_due`.
- **Payment method updates / card replacement before renewal, manual invoice payments** — 100% Polar-side (portal-native payment method management; EmberFlow never touches card data). EmberFlow only reacts to the resulting subscription state, regardless of why it changed. "Manual invoice payments" (pay-by-invoice for enterprise-style billing) isn't a feature EmberFlow's Polar products are configured to use — not applicable to this product.
- **Renewal date shown in UI** — `SubscriptionsPage.jsx` reads `current_period_end` straight from the row via `useSubscription()`; correct once the row is correct.
- **Customer Portal renewal display** — 100% Polar's own hosted UI, nothing rebuilt, nothing to verify in EmberFlow's code.

### Idempotency — answered explicitly, as asked

- **Create duplicates?** No — `webhook_events` id-based dedup returns early on any redelivery of the same event before any write happens.
- **Reset dates incorrectly?** Not on a genuine replay (identical payload in, identical write out). **Separate, not-yet-observed risk worth flagging**: `normalizeSubscription()` has no guard against processing events *out of order* (a genuinely different problem from replay) — if Polar ever redelivered an older, distinct event after a newer one already landed, the older event's dates would overwrite the newer ones, since there's no "only apply if newer" check (e.g. comparing `modified_at`). No evidence this has happened; not fixing it now since it's hardening against a theoretical case, not a confirmed bug — flagged as a recommendation.
- **Remove access?** No — only a genuine status change out of the granting set removes access; a replayed renewal event has `status: 'active'` and changes nothing.
- **Extend access twice?** Not a meaningful failure mode here — EmberFlow has no cumulative/incrementing renewal counter or usage-based extension; entitlement is always derived fresh from the *current* stored `status`/`plan`, never accumulated, so there's nothing to double-extend.

### Known, accepted residual gap (not fixed — same category as prior documented limitations)

A renewal happens automatically in the background with no user navigation involved at all. If a user has EmberFlow open in an already-focused, never-backgrounded tab through a renewal, the displayed `current_period_end` won't update until *something* triggers a refetch (a `visibilitychange`/`pageshow` event, or a manual reload) — there's no polling or realtime subscription. This is the same category of tradeoff already accepted for other flows (see `useSubscription.js`'s own comments) — a realtime subscription would close it but is new architecture, correctly out of scope for a bug-fix pass.

- [ ] Live-test a monthly renewal in sandbox (Polar's sandbox should support fast-forwarding or a short test interval — check their sandbox docs) → confirm `subscription.updated` lands, `current_period_start`/`current_period_end` advance, `status` stays `active`
- [ ] Live-test a yearly renewal the same way
- [ ] Uncancel a subscription, then let it hit its next renewal → confirm `cancel_at_period_end` stays `false` throughout
- [ ] Recover from `past_due` (successful retry), then let the next normal renewal happen → confirm no leftover `past_due` artifacts
- [ ] Replay a renewal's webhook delivery from the Polar dashboard → confirm `{duplicate: true}`, no change to the row

## 7. Failed payments

**Full audit performed 2026-07-30, verified against Polar's dedicated failed-payments doc (`polar.sh/docs/features/subscriptions/failed-payments`), quoted not assumed. One real bug found and fixed: the `past_due` state was presented as if the subscription were healthy. Backend/entitlement logic was verified correct and unchanged.**

### Polar's real dunning flow (exact, from Polar's own docs)

- Renewal charge fails → subscription moves `active` → `past_due`, `past_due_at` stamped.
- **Automatic retries: 4 attempts at 2, 7, 14, 21 days** after the initial failure. Polar emails the customer a Customer Portal link on failure so they can update their card. EmberFlow does **not** need to build any of this — retries, dunning emails, and the card-update UI are all Polar-native.
- **Access during `past_due` depends on the org's grace-period setting** (Polar dashboard → Settings → Subscriptions): default is **"Immediately"** (benefits revoked as soon as it leaves `active`); configurable to hold benefits for 2 / 7 / 14 / 21 days.
- Retries exhausted → subscription **revoked**: status → `canceled` (per the failed-payments page) — note Polar's *other* doc (`subscriptionrevoked.md`) says `unpaid`; the two Polar docs disagree, but see below for why it doesn't matter to EmberFlow.

### Entitlement logic — verified correct, no code change

- EmberFlow grants Pro during `past_due` (`hasAccessGrantingStatus` in `api/_utils/polar.js` AND `isSubscriptionActive` in `utils/plans.js` both include it — confirmed the two agree, no drift). This is a **deliberate, defensible choice**: keep a paying customer in Pro during the ~3-week retry window rather than cutting them off over a transient card decline. Left as-is.
- On revoke, EmberFlow lands on Free correctly **regardless of Polar's `canceled`-vs-`unpaid` doc inconsistency** — neither is in the granting set, so `normalizeSubscription` derives `plan: 'free'` either way. Robust to the ambiguity by construction.
- **Config recommendation (not a code change):** set the Polar dashboard grace period to **21 days** so Polar's own view (its dunning emails, its benefit revocation) agrees with EmberFlow keeping Pro through the retry window. With the default "Immediately" grace, Polar's emails may tell a customer their benefits are revoked while EmberFlow still (correctly, by its own policy) shows Pro — not harmful, but inconsistent messaging. Verify/set this in the dashboard before launch.

### The bug that was fixed (`92ea1b8`)

For a `past_due` subscription the Subscriptions page previously showed a malformed grey "Past_due" badge, a "Renews \<date\>" subtitle that falsely implied health, and **no explanation at all**. Fixed: warning-colored "Past due" badge (StatusBadge now formats snake_case + maps past_due/unpaid), accurate "Payment failed — please update your card" subtitle, and an explanatory notice covering what happened / access retained / auto-retrying / action required / consequence. Rendered-verified in headless Chrome.

- [ ] Force a `past_due` state (Polar sandbox — check their docs for simulating a failed renewal) → confirm the user **keeps** Pro access AND the page now shows the warning "Past due" badge, the "Payment failed" subtitle, and the explanatory notice (the `92ea1b8` fix) — not a silent healthy-looking "Pro"
- [ ] Confirm the Polar dashboard grace-period setting matches EmberFlow's keep-access-during-past_due behavior (recommend 21 days — see above)
- [ ] Confirm Polar actually sends the customer a dunning email with a portal link on the failed charge (Polar-native, but verify it fires in sandbox)
- [ ] Let retries exhaust (or simulate) → `subscription.revoked` → `plan` collapses to `free`, features lock, and the page no longer shows the past_due notice
- [ ] Confirm there's still no user-facing explanation of *why* access was lost specifically after a failed-payment revoke (vs. a voluntary cancel) once the account is back on Free — this remains a minor UX gap (the past_due notice warns them *before* revoke, which is the higher-value moment; a post-revoke explanation is a smaller follow-up, not done this pass)

## 8. Refunds

**Not implemented — recommendations only, see the audit report.** Manual QA once a real policy/process exists:

- [ ] Confirm support's process actually includes cancelling the subscription separately after issuing a refund — Polar's docs are explicit that **refunding an order does not cancel the subscription**; the customer keeps Pro access unless someone separately cancels it
- [ ] Confirm the in-app refund summary (`SubscriptionsPage.jsx`) and the published `/refund` policy say the same thing (this audit found and fixed one contradiction between them — re-check after any future policy change)

## 9. Customer portal

- [ ] Manage billing opens Polar's real hosted portal (not a custom-built page) — confirm this is still true, since "never rebuild what Polar provides" is a hard rule
- [ ] Inside the portal: change card / update payment method works (Polar-native, nothing to test in EmberFlow's own code)
- [ ] Inside the portal: invoice history / receipts are visible and downloadable (Polar-native)
- [ ] Portal opens correctly for a user whose stored `polar_customer_id` is stale/wrong-environment (the `external_customer_id` fallback added in `23a3732` should recover automatically — hard to force deliberately, but worth a note if it's ever observed)
- [ ] Portal route for a genuinely free user (never subscribed) → friendly "no billing account yet" error, not a crash (confirm the exact message reads sensibly, not a raw Polar error string)

## 10. Webhook replay / idempotency

- [ ] Re-deliver the same webhook event from the Polar dashboard's delivery log (most webhook UIs support a "resend" action) → confirm the second delivery returns `{ received: true, duplicate: true }` (via the `webhook_events` id check) and does **not** double-apply or corrupt the `subscriptions` row
- [ ] Confirm a tampered/replayed request with a stale `webhook-timestamp` is rejected with `403` (already covered by `npm run verify:polar`'s automated signature tests — this item is about confirming the *real* Polar dashboard's resend mechanism specifically, not just the unit test)

## 11. Expired subscription

- [ ] A `past_due` subscription that never recovers and eventually reaches `subscription.revoked` — confirm the transition to Free is clean (no leftover `polar_subscription_id` confusion, `current_period_end` still reflects the last real period rather than being nulled out unexpectedly)

## 12. Deleted customer / deleted subscription (edited or removed directly in the Polar dashboard)

- [ ] Delete or edit a subscription directly in the Polar dashboard (not through EmberFlow) → confirm `resolveUserId()`'s fallback (match by `polar_subscription_id`, then `polar_customer_id`) still resolves the correct EmberFlow user if `customer.external_id` is missing from that event
- [ ] A customer deleted entirely in Polar with no corresponding webhook event at all → EmberFlow's row would simply go stale with no update (no event ever arrives to trigger one) — this is a silent gap, not fixable in the webhook handler itself since there's nothing to react to; worth a periodic reconciliation job someday (see Recommendations), not this sprint.

---

## After you finish

Update this file's checkboxes and note any real findings (with the exact `subscriptions` row values, webhook payload, or error message) rather than "worked"/"didn't work." If a scenario reveals a real bug, open it the same way prior sessions have — root cause first, fix second, don't guess.
