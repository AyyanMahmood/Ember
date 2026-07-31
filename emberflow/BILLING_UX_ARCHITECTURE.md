# EmberFlow Billing UX & Architecture — Design Document

**Status:** Proposal for review. **No code has been written for this document.** Implementation is gated on approval of the architecture below.
**Date:** 2026-07-31
**Author:** Claude (design pass, resuming from the v1.5 roadmap at the user's request to revisit billing architecture before building Milestone A's backend items)

**Scope note:** This revisits the *experience and information architecture* of billing. It does **not** propose migrating off Polar, Supabase, Vercel, or Upstash (permanent per CLAUDE.md), and it does not reopen the entitlement-sync *mechanism* (webhooks → `subscriptions` row → `useSubscription()`), which is sound. It proposes changes to flow, IA, copy, and which system owns each step.

---

## 0. Decisions this design must honor (from the brief)

1. Billing lives **entirely inside the `/app/subscriptions` section**. Nothing billing-related in Settings.
2. A user must **never hold two active subscriptions** simultaneously.
3. The **refund policy is our own business decision** (not dictated by Polar).
4. **Polar manages subscriptions, payment methods, invoices, refunds, and cancellations wherever possible** — we don't rebuild what Polar hosts well.
5. EmberFlow **synchronizes entitlement automatically through webhooks** (single source of truth: the `subscriptions` row, read through `useSubscription()`).
6. **Premium, polished, calm** — not an enterprise billing console.

Everything below is measured against these six.

---

## 1. Current-state audit (user's perspective)

Each surface is rated for how it *feels to a user today*, with the concrete friction. Severity: 🔴 breaks/confuses the flow · 🟡 rough but survivable · 🟢 already good.

### 1.1 Pricing page (marketing) — 🔴
- Three separate cards: Free, Pro Monthly, Pro Yearly. No monthly/yearly toggle — the two Pro plans compete for attention side-by-side instead of one Pro plan with a cadence switch.
- **All three CTAs go to `/register`.** "Start monthly" and "Start yearly" are identical links — the chosen cadence is **thrown away**. A user who deliberately clicked "Start yearly" lands in the app with no memory of that choice and must re-decide on the Subscriptions page.
- No annual-savings framing at the point of decision (the "Save $X/year" badge only appears later, inside the app).
- Consequence: the marketing page creates intent, then drops it. The highest-intent moment (a click on a specific paid cadence) leads nowhere near a checkout.

### 1.2 Checkout — 🟢 (mechanically) / 🟡 (entry point)
- `startCheckout(plan)` → `/api/polar/checkout` → Polar hosted checkout. Server-side plan allow-list, a 409 guard against a second active subscription, rate-limited. This is solid and secure.
- 🟡 The *only* place to actually start checkout is the in-app Subscriptions page. There is no path from marketing Pricing straight into checkout (see 1.1). Checkout is one navigation + one re-decision away from where intent formed.

### 1.3 Success flow — 🟡
- Returns to `/app/subscriptions?billing=success`, then **polls up to 8× every 2s (~16s)** showing a "Confirming your purchase with Polar…" Alert until the webhook writes `plan=pro_*`.
- Correct and honest, but a **16-second worst-case spinner** is the first thing a new Pro customer sees. It works around webhook latency rather than celebrating the upgrade. No success moment, no "here's what you just unlocked."

### 1.4 Subscriptions page — 🟢 mostly
- Genuinely good: plan hero with renewal ring, usage meters, cadence picker with animated price, billing-history portal link, refund summary, FAQ, support, danger zone. Recently rebuilt on Ember UI primitives. This is the strongest surface.
- 🟡 It carries a lot: plan state, upgrade, cadence-switch explainer, history, refunds, FAQ, support, cancel — all stacked. IA could be tiered (see §3).

### 1.5 Polar customer portal — 🟢
- Card changes, invoice/receipt history, and cancellation are 100% Polar-hosted. `return_url` now set. This is exactly the "let Polar own it" intent and should stay.
- 🟡 It's a *context switch to a different-looking site*. Fine for deep/rare actions (download a 6-month-old receipt); jarring for common ones (see cancellation and switching below).

### 1.6 Cancellation flow — 🟡
- In-app "Cancel subscription" → ConfirmDialog → **opens the Polar portal to actually cancel.** So the in-app control is really a "go cancel elsewhere" button. The user confirms intent twice (our dialog, then Polar's) on two different-looking screens.
- Entitlement-sync-after-portal-cancel is the known deferred issue (bfcache/return-path fixes landed; live-test still pending).

### 1.7 Refund flow — 🟡
- No in-app refund anything. Policy is stated (non-refundable except billing errors/duplicates/outage) with a link to `/refund`. A refund happens only by emailing support → a human issues it in the Polar dashboard.
- Acceptable for v1 (low volume, our policy is intentionally narrow), but there's **no in-app "request a refund / report a billing problem" affordance** — the user has to find the support email.
- ⚠️ Operational trap already documented: in Polar, **refunding an order does not cancel the subscription** — the two are separate actions. Any refund path must handle both.

### 1.8 Failed-payment flow — 🟢 (just hardened)
- `past_due` keeps Pro, shows an in-hero warning + (new) an app-wide `BillingNudge`. Post-revoke (`unpaid`) now shows a clear "your plan ended, resubscribe" Alert. Card update via portal. This is now in good shape.

### 1.9 Plan switching (Monthly ↔ Yearly) — 🔴 (the worst surface)
- **No in-place switch.** The documented flow: cancel your current plan in the portal → keep Pro until the period ends → *come back days/weeks later* → subscribe to the other cadence. Explained honestly in a card + FAQ, but the honesty doesn't make it good.
- A monthly customer who wants to switch to yearly (i.e., **give us more money**) must wait up to a month and remember to return. This is the single biggest gap between EmberFlow and every product in §2.
- Root reason on record: EmberFlow deliberately avoided building proration UI. But Polar *does* support in-place product changes (Update Subscription API) and a portal-native plan switch — so the capability exists; we just don't use it.

### 1.10 Billing history — 🟡
- Not in-app at all. Portal-only (Polar hosts the invoice/receipt list). Fine as the *source of truth*, but the in-app page only offers a "View in Polar's portal" link — no at-a-glance "last payment: $11 on Jul 3" even as a read-only echo.

### 1.11 Payment methods — 🟢 (by design)
- Portal-only, correctly. Card data should never touch EmberFlow. Keep as-is; the only improvement is making the entry point feel first-class rather than buried in a history card.

### Current-state summary

| Surface | Verdict | Headline issue |
|---|---|---|
| Pricing (marketing) | 🔴 | CTAs drop the chosen cadence; no toggle |
| Checkout | 🟢/🟡 | Solid, but no path from marketing |
| Success | 🟡 | Up-to-16s spinner, no celebration |
| Subscriptions page | 🟢 | Strong; slightly overloaded IA |
| Polar portal | 🟢 | Keep; just a context switch |
| Cancellation | 🟡 | Double-confirm across two sites |
| Refund | 🟡 | No in-app affordance at all |
| Failed payment | 🟢 | Just hardened |
| **Plan switching** | 🔴 | **Multi-day cancel-then-resubscribe dance** |
| Billing history | 🟡 | Portal-only, no in-app echo |
| Payment methods | 🟢 | Correctly Polar-owned |

**The two things to fix first: (1) plan switching, (2) the marketing→checkout handoff.** Everything else is polish on an already-decent base.

---

## 2. How modern SaaS does billing (UX & IA patterns)

Focus: information architecture and flow, not visual copying. What each does that's worth learning from — and where EmberFlow should *not* follow.

### Linear
- Billing is a **single, quiet Settings → Plans page**. Plan cards, a monthly/annual toggle that updates prices in place, seat count inline. Upgrades are **instant and in-place** (Stripe-backed) — no send-you-elsewhere. Downgrades scheduled to period end.
- **Lesson:** one calm page; the cadence toggle lives *with* the plan, not as two competing cards; switching is in-place and immediate. This is the closest spiritual match to EmberFlow's "premium, not enterprise" goal.

### Vercel
- Billing is deeper (usage-based): a dashboard with current usage, spending, invoices, and payment method all in-app; Stripe hosts only the card entry.
- **Lesson:** in-app **read-only echoes** of invoices/usage are valuable even when the provider is the source of truth — you don't have to bounce users out to *see* their last charge. **Anti-lesson:** Vercel's density is enterprise-grade; EmberFlow (one product, two plans) must **not** adopt that surface area.

### Notion
- Plan cards with an **in-app upgrade modal**; monthly/annual toggle; a clear "you'll be charged $X, prorated" confirmation. Payment method + invoice history in-app (Stripe portal for card edits).
- **Lesson:** the **proration/confirmation step done in-app** ("here's exactly what changes and what you'll pay today") is the pattern that makes plan-switching feel safe. This is the model for EmberFlow's Monthly↔Yearly fix.

### Framer
- Plan selection with a prominent **annual toggle showing "save 2 months"** framed at the decision point; upgrade in-flow. Premium, minimal, motion-considered — closest visual cousin to EmberFlow's target feel.
- **Lesson:** put the **annual-savings framing at the moment of choice**, not after. Keep the whole thing to one elegant surface.

### Arc
- Consumer-simple: essentially one plan, minimal billing chrome, membership framed as identity ("you're a member") rather than a dashboard.
- **Lesson:** **framing over instrumentation** — "You're on Pro" as a state of being, calm and human, beats a metrics console. Matches EmberFlow's brand personality (calm, premium, effortless).

### Cursor
- A simple **Pro toggle**: one paid tier, upgrade in two clicks, manage via a hosted portal. Very little billing UI.
- **Lesson:** for a small plan matrix (which EmberFlow has — Free + Pro×cadence), **less is more**. Don't build billing surface area the plan count doesn't justify.

### GitHub
- The **enterprise reference**: billing settings with plans, spending limits, payment info, detailed history, per-feature metering.
- **Anti-lesson, mostly.** This is what EmberFlow's brief explicitly says *not* to become. Worth knowing as the boundary: the one transferable idea is a clean **plan-comparison table** for deciding Free vs Pro; the rest is too heavy.

### Synthesis — the pattern EmberFlow should adopt

> **Linear's calm one-page IA + Notion's in-app prorated switch confirmation + Framer's annual framing at the decision point + Arc's "you're a member" tone.** In-app for the *common* actions (upgrade, switch cadence, see current state, cancel-intent), Polar-hosted for the *deep/sensitive* ones (card entry, full invoice archive, actual payment processing). Read-only in-app echoes (last payment, next renewal) so users rarely *need* to leave.

Every product above that feels premium shares one trait EmberFlow currently lacks: **the common money-moving actions happen where the user already is, in-place and immediate.** Only EmberFlow sends users to another site to switch a plan or cancel.

---

## 3. Proposed ideal EmberFlow billing experience

### 3.1 Principles
1. **One home.** Everything lives in `/app/subscriptions`, tiered top-to-bottom: *state → change → history/help → danger*.
2. **In-place for common actions, Polar-hosted for deep ones.** The user leaves EmberFlow only to type a card number or dig through the full invoice archive.
3. **One subscription, always.** Enforced structurally (see 3.4) — never two parallel Polar subscriptions.
4. **Every state legible.** Active, cancelling, past_due, revoked, switching — each has clear copy, one obvious next action (the `Alert` primitive already does this).
5. **Calm, human framing.** "You're on Pro" not "Subscription: active (id …)". Motion reserved for the one signature moment: a successful upgrade.

### 3.2 Target information architecture (the Subscriptions page)

```
/app/subscriptions
├─ [state banner]      ← only when non-nominal: past_due / cancelling / revoked (Alert)
├─ Plan hero          ← "You're on Pro (Yearly)" · renewal ring · next charge · Manage payment
├─ Usage              ← invoices + clients meters (Free shows limits; Pro shows "Unlimited")
├─ Change plan        ← Free: upgrade w/ cadence toggle + annual savings
│                        Pro: **in-place Monthly↔Yearly switch** with prorated confirm (§3.3)
├─ Billing & receipts ← read-only echo of last charge + next renewal; "All invoices in Polar →"
├─ Refund / billing help ← policy summary + "Report a billing problem" (§3.5)
├─ FAQ
└─ Danger zone        ← cancel (intent in-app; §3.6)
```

Marketing **Pricing page** (§3.7) becomes: one Pro plan + monthly/annual toggle + annual-savings framing, CTAs that carry the chosen cadence through registration into a pre-selected checkout.

### 3.3 The central recommendation — fix plan switching

This is the highest-impact change. Three options, recommended in order:

**Option A (recommended primary): Polar customer-portal native plan switch.**
Polar's customer portal has a configurable "switch plan" capability. Enable it; the Monthly↔Yearly change happens *inside the portal Polar already hosts*, Polar handles proration, and EmberFlow syncs the result via the `subscription.updated` webhook we already consume. **Zero new proration logic in EmberFlow. Structurally one subscription** (an update, not a new sub). Best alignment with decisions #2, #4, #5.
- *Cost:* still a context-switch to the portal for switching (but a *fast, single-action* one — not a multi-day dance). Acceptable, and far better than today.

**Option B (recommended if we want it fully in-app): Polar Update Subscription API, in-place, with an in-app prorated confirm.**
Call Polar's Update Subscription endpoint (`product_id` + `proration_behavior`) from a new authenticated route. Show a **Notion-style confirm first**: "Switch to Yearly — you'll be charged/credited $X today, then $130/year." One subscription, updated in place; entitlement flows through the same webhook. Fully in-app, most premium.
- *Cost:* we build the confirm UI + a preview of the proration amount (Polar can compute/preview this), and own the edge cases (switch while past_due, etc.). More work; highest polish.

**Option C (fallback, not recommended): keep cancel-then-resubscribe, but make it feel intentional.**
Only if A and B are both rejected. Schedule the switch: cancel-at-period-end + a stored "resubscribe to yearly on <date>" intent we act on. Still delayed; still the weakest.

> **Recommendation:** ship **Option A** first (small, safe, immediately removes the 🔴), and treat **Option B** as the premium follow-up if we want the switch to never leave the app. Both satisfy "never two active subscriptions" *better than today*, because both are a single-subscription update rather than a cancel + new-create.

### 3.4 "Never two subscriptions" — reaffirmed and strengthened
- Keep the **409 guard** in `checkout.js` (blocks a new checkout while an access-granting subscription exists).
- With Option A/B, cadence changes stop going through checkout entirely (they're updates), so the guard's job shrinks to "block a genuine second *new* purchase" — exactly right.
- The remaining theoretical gap (two concurrent first-time checkouts — the TOCTOU item deferred in Milestone A) is unaffected by this redesign and stays a separate, later hardening item.

### 3.5 Refund experience (our policy, Polar-executed)
- Keep the **narrow, defensible policy** (non-refundable except billing errors / duplicate charges / extended outage). It matches how Polar itself frames discretionary refunds and avoids the no-questions-asked-window support burden.
- **Add an in-app affordance:** a "Report a billing problem" action in the Refund/help block → opens a prefilled support email (or a lightweight form) with the user's plan + last-charge context attached. This replaces "go find our support email."
- **Internal (documented, not user-facing):** the refund runbook must state the Polar trap — *refund the order **and** cancel the subscription* are two separate steps, or a refunded user keeps Pro. This already exists in `SUPPORT_PLAYBOOK.md`; link it from the refund block's internal notes.

### 3.6 Cancellation
- Keep **intent in-app** (the danger-zone button + ConfirmDialog), but decide one of:
  - **B-style in-app cancel:** call Polar's cancel API directly (set `cancel_at_period_end`) from an authenticated route, show the "you keep Pro until <date>" state immediately, no portal bounce. Most premium; small new route.
  - **Portal cancel (today):** keep bouncing to the portal to finish. Simpler, but the double-confirm-across-two-sites friction and the known sync-after-return issue remain.
- **Recommendation:** move cancel **in-app** (cancel-at-period-end via API) as part of Option B's route work — it also sidesteps the deferred portal-return sync bug for the *cancel* path specifically, because we set the state ourselves and get the confirming webhook, with no bfcache return to depend on.

### 3.7 Marketing → checkout handoff
- Pricing page: collapse to **one Pro plan + a monthly/annual segmented toggle** (reuse the Ember UI `SegmentedControl`), annual-savings framing shown inline at the toggle.
- CTA carries the choice: `/register?plan=pro_yearly` → after signup, land on `/app/subscriptions` with that cadence **pre-selected**, or (higher-intent) straight into checkout for that plan. Preserves the intent the current page discards.
- Free CTA unchanged (`/register`).

### 3.8 Success moment
- Replace the bare confirming-spinner with a two-state experience: while the webhook lands, the existing honest "confirming…" `Alert`; on success, a **brief calm celebration** ("You're on Pro 🎉 — Analytics, Proposals, unlimited invoices, and Brand Studio are unlocked") — one signature motion moment (allowed by the Motion Rules for exactly this kind of event), then settle into the normal plan hero.
- Keep the ~16s poll as the *fallback ceiling*, but front it with the celebration the moment `isPro` flips.

### 3.9 What stays in Polar (unchanged, by design)
Card entry & storage · the full invoice/receipt archive · actual payment processing & retries (dunning) · tax/VAT · refund *execution*. EmberFlow never rebuilds these — it links to them and echoes read-only summaries.

---

## 4. Entitlement sync — reaffirmed, no change
The webhook → `subscriptions` upsert → `useSubscription()` model is correct and stays. Option A/B both resolve through the **same `subscription.updated`/`subscription.*` events already consumed**, and `normalizeSubscription()`'s status-aware plan derivation already handles the resulting states. No schema change is required for Option A; Option B needs no schema change either (it reads/writes the same row). The only related open item is confirming the live Polar dashboard has all `subscription.*` events selected — already tracked as a launch blocker.

---

## 5. Open decisions (need your call before implementation)

1. **Plan switching — Option A (portal-native switch), Option B (in-app prorated update), or C (fallback)?** This is the biggest one. My recommendation: A now, B as the premium follow-up.
2. **Cancellation — move fully in-app (Option B route), or keep the portal bounce?** Recommendation: in-app, bundled with B.
3. **Marketing checkout handoff — land pre-selected on Subscriptions, or push straight into Polar checkout after signup?** Recommendation: pre-selected on Subscriptions (one confirmation beat before payment; lower accidental-charge risk).
4. **Success celebration — in scope for this redesign, or a separate motion task?**
5. **In-app "report a billing problem" — prefilled email (simple) or a lightweight in-app form (more work)?**
6. **Billing-history echo — add a read-only "last charge / next renewal" line in-app, or keep portal-only?**

---

## 6. Suggested implementation phasing (after approval — not started)

1. **Marketing handoff** (Pricing toggle + cadence-carrying CTA + pre-selected checkout). Self-contained, high visible win, no billing-logic risk.
2. **Plan switching Option A** (enable Polar portal plan-switch; update in-app copy from "cancel-then-resubscribe dance" to "switch plan →"; verify the `subscription.updated` sync). Removes the biggest 🔴 with minimal code.
3. **Subscriptions IA tiering + billing-history echo + refund "report a problem"** (presentation + one read path).
4. **Success celebration** (one signature motion moment).
5. *(If approved)* **Option B**: in-app prorated switch + in-app cancel via authenticated Polar routes. The premium ceiling.
6. Only *then* return to the deferred **Milestone A backend-correctness items** (out-of-order webhook guard, TOCTOU, reconciliation) — they're orthogonal to this UX redesign and unaffected by it.

---

## 7. Non-goals / constraints respected
- No provider migration (Polar/Supabase/Vercel/Upstash permanent).
- No card data in EmberFlow, ever.
- No enterprise billing console (GitHub-style) — calm and minimal, matched to a two-plan product.
- No change to the entitlement-sync mechanism or the `subscriptions` schema for Options A.
- Deferred **portal-cancellation sync bug** and **Milestone A backend items** remain deferred; this doc does not implement them (though moving cancel in-app via Option B would *sidestep* the portal-return sync path for the cancel case specifically).

---

*End of proposal. Awaiting approval / decisions on §5 before any implementation.*
