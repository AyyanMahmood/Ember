# EmberFlow Support Playbook — Billing

Operational guide for handling billing support requests. Every billing **charge, refund, tax line, and receipt** is handled by **Polar** as Merchant of Record — EmberFlow never touches card data. As of the 2026-07-31 customer-journey work, the common actions (upgrade, **switch plan**, **cancel**, **resume**) all happen **inside EmberFlow** via Polar's API; the Polar customer **portal** is now used only for **updating a card** and **downloading invoices/receipts**.

**Support inbox:** `support@emberflow.com` · **Billing provider dashboard:** Polar (sandbox: sandbox.polar.sh · production: polar.sh)

---

## Quick reference: where does each thing live?

| Customer need | Who handles it | Where |
|---|---|---|
| Upgrade to Pro | EmberFlow → Polar hosted checkout | `/app/subscriptions` → Upgrade (or a Pricing CTA) |
| Switch Monthly ↔ Yearly | **EmberFlow (in-app)** | `/app/subscriptions` → **Switch to Monthly/Yearly** |
| Cancel subscription | **EmberFlow (in-app)** | `/app/subscriptions` → **Cancel subscription** |
| Resume a cancelling subscription | **EmberFlow (in-app)** | `/app/subscriptions` → **Resume subscription** |
| Update card / payment method | Polar (self-serve) | **Manage billing** / **View all invoices** → portal |
| Download an invoice / receipt | Polar (self-serve) | **View all invoices** → portal |
| Refund a charge | Polar (you, from dashboard) | Polar dashboard → order → Refund |
| Report a billing problem | EmberFlow → support email | `/app/subscriptions` → **Report a billing problem** (prefilled email) |
| "I was charged but I'm still on Free" | EmberFlow entitlement sync | See §Entitlement not syncing |
| "My payment failed" | Polar dunning (automatic) | See §Failed payments |
| "What's the Early Supporter badge?" | Cosmetic recognition | See §Early Supporter badge |

> **Key change vs. the old playbook:** switching and cancelling are **no longer portal actions**. If a customer or a teammate says "cancel in the portal" / "switch by cancel-then-resubscribe," that's the pre-2026-07-31 flow — it's now done in-app with a single click. The portal only does cards + invoices.

---

## Checkout flow (upgrade)

1. A customer upgrades from `/app/subscriptions` (Upgrade card, cadence picker), **or** from a Pricing/Landing CTA.
2. **Plan persists through auth.** A Pricing CTA carries the chosen plan (`/register?plan=pro_yearly`). After the customer registers or signs in (email/password **or** Google), checkout opens **automatically** for that exact plan — they are never asked to pick twice. If they sign up via email confirmation, the plan is remembered and checkout opens after they confirm and sign in.
3. Checkout is Polar's hosted page (card, tax handled by Polar). On success Polar redirects to `/app/subscriptions?billing=success`.
4. EmberFlow shows the **activation experience** (an ember-ring "Welcome to EmberFlow Pro" moment) while the `subscription.active` webhook lands and writes the `subscriptions` row; Pro unlocks. The `?billing=success` param is stripped, so the celebration never replays on refresh.
5. If the webhook is slow, the activation holds briefly and then settles; the page never hangs.

**Support notes:** if a customer says "I paid but I'm on Free," see §Entitlement not syncing. If they say "I picked Yearly but checkout showed Monthly," confirm which CTA they used and whether they had a stale tab — the pending plan is stored per-browser and consumed once.

---

## Switch Monthly ↔ Yearly (in-app)

- **Self-serve, one click:** `/app/subscriptions` → **Switch to Yearly** (or **Monthly**) → confirm dialog → done. This calls Polar's **Update Subscription API** in place (`product_id` + `proration_behavior: invoice`). It is **not** a cancel-and-resubscribe.
- **One subscription, always.** Because it's an *update* to the existing subscription, the customer can never end up with two. Polar **prorates** the difference automatically (charges the difference on an upgrade, credits on a downgrade) — EmberFlow does no proration math and shows no exact figure; the precise amount is on Polar's receipt.
- **Reflection:** after the switch, the page polls briefly and the plan hero updates to the new plan. If it still shows the old plan after ~15s, ask the customer to reload `/app/subscriptions`.
- **If a customer asks "was I double charged to switch?"** — no. It's one subscription, prorated; there is never an overlapping second charge.
- **Edge:** switching is offered only for an active (non-cancelling) subscription. A customer who has scheduled cancellation must **Resume** first, then switch.

---

## Cancellation (in-app)

- **Self-serve:** `/app/subscriptions` → danger zone → **Cancel subscription** → confirm dialog → done. This calls `api/polar/cancel.js` (`cancel_at_period_end: true`) directly — **no portal redirect**.
- **Cancel at period end** is the only cancel EmberFlow offers: the customer keeps Pro until `current_period_end`, then reverts to Free automatically. **Nothing is deleted** — they keep read access to everything they created; Free-tier limits reapply.
- After cancelling, the plan hero shows "Access ends {date}" and a **Resume subscription** action appears.
- **If a customer says "I cancelled but still see Pro"** — that's **correct**: cancel-at-period-end keeps access until the period ends. Confirm the "Access ends {date}" line.
- **If a customer says "I cancelled and lost access immediately"** — EmberFlow never revokes immediately on cancel. Check whether their period had already ended, or whether a **revoke-immediately** was done from the Polar dashboard by an operator (rare, irreversible).

## Resume (un-cancel, in-app)

- A subscription set to cancel can be resumed any time **before** the period ends: `/app/subscriptions` → **Resume subscription**. This calls the same route with `cancel_at_period_end: false`. Renewals continue as normal; nothing else changes.
- Once the period has actually ended and the subscription is revoked to Free, there is nothing to "resume" — the customer simply subscribes again (a fresh checkout).

---

## Failed payments (dunning)

EmberFlow relies **entirely on Polar's native dunning** — do not build or improvise anything here.

**What Polar does automatically when a renewal charge fails:**
1. Subscription moves `active` → `past_due` (`past_due_at` stamped).
2. Polar **auto-retries 4 times** at **2, 7, 14, and 21 days** after the failure.
3. Polar **emails the customer** on failure with a link to the portal to update their card.
4. If all retries fail, Polar **revokes** the subscription (status → `canceled`/`unpaid`) and fires `subscription.revoked`; EmberFlow drops them to Free automatically.

**What EmberFlow shows during `past_due`:** the Subscriptions page shows a warning "Past due" badge, a "Payment failed — please update your card" subtitle, and an explanatory notice. An **app-wide banner** also appears on every `/app` page prompting a card update. **The customer keeps full Pro access throughout the retry window** (deliberate — see Grace Period below).

**If a customer contacts support about a failed payment:** tell them (a) they still have access, (b) Polar keeps retrying automatically, (c) the fastest fix is **Manage billing → update payment method** (this is the one card action that genuinely lives in the portal). There is nothing to do in EmberFlow's admin.

**Post-revoke:** if their subscription was already revoked to Free specifically because retries were exhausted (status `unpaid`), the Subscriptions page shows a clear "Your Pro plan ended — we couldn't collect your last payment" message with a one-click **Resubscribe**. This is distinct from a voluntary cancel and keyed on the `unpaid` status.

---

## Grace period — official policy: **15 days**

**Policy statement:** a customer whose renewal payment fails keeps full Pro access for **at least 15 days** to resolve it before any loss of access.

**Why 15 days (the reasoning, not an arbitrary number):**
- **Cutting access on the first failed charge is hostile and loses recoverable revenue.** A large share of failed renewals are transient (expired card, temporary hold, insufficient-funds-then-topped-up). Every mature subscription business keeps the customer in their paid tier during a dunning window rather than yanking access immediately.
- **Industry framing:** Stripe's Smart Retries keep a subscription in `past_due` and re-attempt over a configurable window (commonly ~1 week, extendable) before the merchant-chosen end state. Polar retries over 21 days. Developer-tool and productivity SaaS (GitHub, Linear, Slack, Notion, Figma) overwhelmingly **downgrade at period end / after a dunning window** rather than at first failure — the norm is a week-to-three-week cushion, not an instant cutoff.
- **15 days is the deliberate midpoint** for EmberFlow's audience (independent freelancers, often juggling irregular cash flow): long enough to cover a paycheck cycle and a forgotten card, short enough to bound unpaid-access exposure. It sits inside Polar's 21-day retry window.

**Technical reality (stated honestly):** EmberFlow's entitlement code grants Pro for the **entire** `past_due` window — until Polar actually revokes after its retry schedule (~21 days) — because `past_due` is in the access-granting status set. So EmberFlow already honors "at least 15 days" **with margin**, independently of Polar's grace-period dropdown. Polar's dashboard offers Immediately/2/7/14/21 (not 15); set it to **21** so Polar's own dunning emails never revoke before the 15-day commitment. Enforcing *exactly* 15 days is a **v1.5 consideration only** — granting slightly more grace than promised never harms a customer, so it is not a launch blocker.

---

## Refund requests

**Policy (published at `/refund`):** subscription charges are **non-refundable** except for billing errors, duplicate charges, or an extended outage (>48h of core functionality down), at EmberFlow's discretion. The Free plan never involves a charge. (The in-app "Refund policy" card on `/app/subscriptions` states the same summary — they must not contradict; re-check both after any policy change.)

**How to process an approved refund:**
1. Open the Polar dashboard → **Orders** → find the order → **Refund order** (full or partial; Polar auto-calculates the tax portion).
2. **CRITICAL — refunding does NOT cancel the subscription.** Polar's own docs are explicit: "refunding the order returns the money but does not end the relationship." If the intent is to end access too, you must **also cancel** — and now that cancel is one click in-app, prefer asking the customer to cancel in EmberFlow (or do it via the Polar dashboard's cancel), as a **separate** step. A refund alone leaves them on Pro until the period ends.
3. Payment-processing fees are **not** returned to EmberFlow on a refund (~2.9%+30¢ is retained regardless). Factor this into goodwill-refund decisions.
4. Note the Polar `order_id` and reason in the support thread.

**Refund windows (recommended policy — see `LAUNCH_READINESS_REPORT.md` → Refund Research for the full competitive analysis):**
- **Monthly:** discretionary only (billing error / duplicate / outage). A monthly charge is small ($11) and the customer is never more than ~30 days from being able to cancel, so a blanket money-back window mainly invites abuse.
- **Yearly:** discretionary, **plus** honor a good-faith **14-day** cooling-off refund for a first-time yearly purchase if the customer requests it and has made minimal use — a $130 up-front commitment warrants more goodwill. Prorated refunds are not offered mid-term; direct the customer to cancel (keeps access to period end) instead.
- **Fraud prevention:** confirm the request comes from the account's own email; be wary of "refund + immediately re-subscribe" loops and refunds requested right after heavy export activity.

---

## Billing problems (in-app report)

- The Subscriptions page's **"Report a billing problem"** button opens the customer's mail client with a **prefilled** support email — subject `EmberFlow billing problem`, and a body pre-populated with their account email, current plan, and status. This is **not** a ticketing system; it lands in the normal support inbox.
- When one of these arrives, you already have the account + plan context in the body. Match it to the Polar dashboard by the customer's email, and use the scenarios below.

---

## Early Supporter badge

- The small grey **"Early Supporter"** pill on `/app/subscriptions` is **cosmetic recognition** for accounts created on or before the launch cutoff (`EARLY_SUPPORTER_CUTOFF` in `utils/earlySupporter.js`, derived from the account's `created_at`). It has **no functional or billing effect** — no discount, no different entitlements.
- **If a customer asks "what does Early Supporter get me?"** — it's a thank-you for joining early; it doesn't change pricing or features. If a promotional benefit is ever attached to it, update this section (today there is none).

---

## Customer Portal — what it is (and isn't) responsible for now

Polar's hosted portal (opened via **Manage billing** or **View all invoices**) is responsible for **only two things** going forward:
1. **Payment methods** — add/replace the card. EmberFlow never sees card data.
2. **Invoices / receipts** — the full historical archive, downloadable.

Everything else that used to be "go to the portal" is now **in-app**: upgrading (checkout), **switching plans**, **cancelling**, **resuming**. Do **not** tell customers to cancel or switch in the portal — send them to the in-app controls. (Polar's portal *may* still expose a self-serve cancel/plan-switch if that feature is enabled on the org; for consistency with EmberFlow's messaging, keep those portal features **disabled** in the Polar dashboard so the in-app flow is the single path — see LAUNCH_QA.md → Customer Portal.)

**In-app billing summary** (`/app/subscriptions`) shows Current plan, Renewal date, Last payment, and Next payment, derived from the subscription row — it does **not** duplicate Polar's invoice archive; "View all invoices" is the link out to Polar for the full history.

---

## Common customer support scenarios

| Customer says | Reality / what to check | What to tell them |
|---|---|---|
| "I paid but I'm still on Free." | Webhook sync lag or failure. See §Entitlement not syncing. | "Give it a few seconds and reload `/app/subscriptions`." If still wrong after a webhook resend, escalate. |
| "I switched to Yearly but still see Monthly." | Poll hasn't caught the `subscription.updated` webhook. | "Reload `/app/subscriptions`." If still wrong, check the row vs. Polar dashboard, then escalate. |
| "I cancelled but still have Pro." | Correct — cancel-at-period-end. | "You keep Pro until {access-ends date}; you can Resume any time before then." |
| "I want to switch to yearly to save money." | In-app switch, prorated. | "On `/app/subscriptions`, click Switch to Yearly — it's instant, prorated, one subscription." |
| "My card failed / I got a dunning email." | Polar dunning; access retained. | "You still have Pro. Click Manage billing to update your card; Polar retries automatically." |
| "Refund me." | Check policy + refund≠cancel. | Apply §Refund requests; if approved, refund in Polar **and** cancel separately. |
| "What's Early Supporter?" | Cosmetic. | "A thank-you for joining early — no change to price or features." |
| "Can I have both Monthly and Yearly?" | No — one subscription by construction. | "EmberFlow only ever has one active subscription; switching replaces, never adds." |

---

## Internal troubleshooting

### Entitlement not syncing ("charged but on Free" / stale plan after switch/cancel)
- EmberFlow reflects switch/cancel/resume by **polling** the `subscriptions` row for a few seconds after the action; the **webhook** is the source of truth that writes the row. If the poll window (~15s) expires before the webhook lands, a manual reload of `/app/subscriptions` shows the synced state.
- To **force a re-sync**: Polar dashboard → Webhooks → the endpoint's delivery log → **resend** the latest `subscription.*` event for that customer. EmberFlow re-upserts from the fresh payload (idempotent — a replay never double-applies).
- Do **not** hand-edit the `subscriptions` row in Supabase to "fix" entitlement — the webhook is the single source of truth and overwrites manual edits on the next event.
- > **Known deferred issue:** entitlement sync after certain out-of-EmberFlow changes (notably a cancel done *inside Polar's portal* rather than in-app) can lag until a refetch. This is a **separately-tracked** webhook-sync investigation (see `KNOWN_ISSUES.md`); it does **not** affect the in-app cancel/switch path, which returns immediately and polls. Steering customers to the **in-app** controls avoids it.

### Switch / cancel route errors
- `api/polar/switch.js` and `api/polar/cancel.js` require the org access token to have the **subscriptions (write)** scope. A `Couldn't switch your plan: …` / `Couldn't cancel your subscription: …` message with a Polar 403 usually means that scope is missing — add it in Polar dashboard → Developers and redeploy is not needed (token scope is server-side), but a token *created before* this scope existed must be regenerated with it.
- `409` on switch = the user has no active paid subscription to switch (they'd need to purchase first), or they're already on that plan.

### Portal issues ("Manage billing does nothing / errors")
1. **"Couldn't open the billing portal: …"** — the real Polar error is surfaced (not a generic string). Common causes: the token is missing the **customer_sessions (write)** scope, or a stale `polar_customer_id` from an environment switch (the route auto-falls back to `external_customer_id`, so this usually self-heals).
2. **Portal button doesn't appear** — the customer has no Polar customer yet (never subscribed). Expected.

### Webhook replay / "my state looks wrong in the DB"
- EmberFlow dedupes webhooks by Polar's `webhook-id` (idempotent).
- A `403` in the delivery log = signature mismatch: `POLAR_WEBHOOK_SECRET` in Vercel doesn't match the endpoint's signing secret, or the endpoint **Format** isn't **Raw**. See `POLAR_SETUP.md` → Troubleshooting.

### Escalation
Anything that looks like a **double charge, a charge with no corresponding `subscriptions` row, two subscriptions for one customer in the Polar dashboard, or entitlement that won't sync after a webhook resend** → escalate to engineering with the Polar `order_id`/`subscription_id`, the account email, and the relevant Vercel function-log lines. Do not attempt manual `subscriptions` edits.
