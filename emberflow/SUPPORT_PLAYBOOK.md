# EmberFlow Support Playbook — Billing

Operational guide for handling billing support requests. Every billing charge, refund, tax line, and receipt is handled by **Polar** as Merchant of Record — EmberFlow never touches card data. Most "billing problems" are resolved by sending the customer to Polar's customer portal (**Manage billing** on `/app/subscriptions`), not by anything in EmberFlow's own admin.

**Support inbox:** `support@emberflow.com` · **Billing provider dashboard:** Polar (sandbox: sandbox.polar.sh · production: polar.sh)

---

## Quick reference: where does each thing live?

| Customer need | Who handles it | Where |
|---|---|---|
| Update card / payment method | Polar (self-serve) | Manage billing → portal |
| Download an invoice / receipt | Polar (self-serve) | Manage billing → portal |
| Cancel subscription | Polar (self-serve) | Manage billing → portal → Cancel |
| Refund a charge | Polar (you, from dashboard) | Polar dashboard → order → Refund |
| "I was charged but I'm still on Free" | EmberFlow entitlement sync | See §Failed Sync below |
| "My payment failed" | Polar dunning (automatic) | See §Failed Payments below |
| Change Monthly ↔ Yearly | Cancel + resubscribe | See §Cadence Change below |

---

## Refund requests

**Policy (published at `/refund`):** subscription charges are **non-refundable** except for billing errors, duplicate charges, or an extended outage (>48h of core functionality down), at EmberFlow's discretion. The Free plan never involves a charge.

**How to process an approved refund:**
1. Open the Polar dashboard → **Orders** → find the order → **Refund order** (full or partial; Polar auto-calculates the tax portion).
2. **CRITICAL — refunding does NOT cancel the subscription.** Polar's own docs are explicit: "refunding the order returns the money but does not end the relationship." If the intent is to end the customer's access too, you must **also cancel the subscription** (portal or dashboard) as a **separate** step. A refund alone leaves them on Pro until the period ends or they cancel.
3. Payment-processing fees are **not** returned to EmberFlow on a refund (~2.9%+30¢ is retained by the networks regardless). Factor this into goodwill-refund decisions.
4. Note the Polar `order_id` and reason in the support thread.

**Refund windows (recommended policy — see `LAUNCH_READINESS_REPORT.md` → Refund Research for the full competitive analysis):**
- **Monthly:** discretionary only (billing error / duplicate / outage). A monthly charge is small ($11) and the customer is never more than ~30 days from being able to cancel, so a blanket money-back window mainly invites abuse.
- **Yearly:** discretionary, **plus** honor a good-faith **14-day** cooling-off refund for a first-time yearly purchase if the customer requests it and has made minimal use — a $130 up-front commitment warrants more goodwill than a monthly one, and this matches the cooling-off norm across annual SaaS plans. Prorated refunds are not offered mid-term; direct the customer to cancel (keeps access to period end) instead.
- **Fraud prevention:** for any refund, confirm the request comes from the account's own email; be wary of "refund + immediately re-subscribe" loops and refunds requested right after heavy export activity. Polar's 60-day chargeback-prevention discretion is a backstop, not a promise to customers.

---

## Failed payments (dunning)

EmberFlow relies **entirely on Polar's native dunning** — do not build or improvise anything here.

**What Polar does automatically when a renewal charge fails:**
1. Subscription moves `active` → `past_due` (`past_due_at` stamped).
2. Polar **auto-retries 4 times** at **2, 7, 14, and 21 days** after the failure.
3. Polar **emails the customer** on failure with a link to the portal to update their card.
4. If all retries fail, Polar **revokes** the subscription (status → `canceled`/`unpaid`) and fires `subscription.revoked`; EmberFlow drops them to Free automatically.

**What EmberFlow shows the customer during `past_due`:** the Subscriptions page shows a "Past due" badge, a "Payment failed — please update your card" subtitle, and a notice explaining they keep Pro access while Polar retries and how to fix it. **They keep full Pro access throughout the retry window** (this is deliberate — see Grace Period below).

**If a customer contacts support about a failed payment:** tell them (a) they still have access, (b) Polar will keep retrying automatically, (c) the fastest fix is **Manage billing → update payment method**. There is nothing to do in EmberFlow's admin.

---

## Grace period — official policy: **15 days**

**Policy statement:** a customer whose renewal payment fails keeps full Pro access for **at least 15 days** to resolve it before any loss of access.

**Why 15 days (the reasoning, not an arbitrary number):**
- **Cutting access on the first failed charge is hostile and loses recoverable revenue.** A large share of failed renewals are transient (expired card, temporary hold, insufficient-funds-then-topped-up). Every mature subscription business keeps the customer in their paid tier during a dunning window rather than yanking access immediately.
- **Industry framing:** Stripe's Smart Retries keep a subscription in `past_due` and re-attempt over a configurable window (commonly ~1 week, extendable) before the merchant-chosen end state. Polar retries over 21 days. Developer-tool and productivity SaaS (GitHub, Linear, Slack, Notion, Figma) overwhelmingly **downgrade at period end / after a dunning window** rather than at first failure — the norm is a week-to-three-week cushion, not an instant cutoff. Adobe is the deliberate outlier (annual lock-in + early-termination fees); that punitive model is explicitly *not* appropriate for a freelancer tool whose brand is "calm, premium, trustworthy."
- **15 days is the deliberate midpoint** for EmberFlow's audience (independent freelancers, often juggling irregular cash flow): long enough to comfortably cover a paycheck cycle and a forgotten card, short enough to bound unpaid-access exposure. It sits inside Polar's 21-day retry window, so a customer who is going to recover almost always does so before access is ever at risk.

**Technical reality (stated honestly):** EmberFlow's entitlement code grants Pro for the **entire** `past_due` window — until Polar actually revokes after its retry schedule (~21 days) — because `past_due` is in the access-granting status set. So EmberFlow already honors "at least 15 days" **with margin**, and does so independently of Polar's grace-period dropdown (which governs Polar's own benefit system, not EmberFlow's). Polar's dashboard offers Immediately/2/7/14/21 (not 15); set it to **21** so Polar's own dunning emails never revoke before the 15-day commitment. Enforcing *exactly* 15 days (cutting access at day 15 even though Polar still retries to 21) would require custom logic and is a **v1.5 consideration only** — granting slightly more grace than promised never harms a customer, so it is not a launch blocker.

---

## Cancellation

- **Self-serve:** Manage billing → portal → Cancel. Default is **cancel at period end** — the customer keeps Pro until `current_period_end`, then reverts to Free. Nothing is deleted.
- EmberFlow's own "Cancel subscription" (Subscriptions page danger zone) opens a confirm dialog, then routes to the same Polar portal — EmberFlow has no independent cancel API call.
- **Uncancel:** before the period ends, the customer can resume from the portal; EmberFlow reflects it on the next `subscription.*` event / page refocus.
- If a customer says "I cancelled but still see Pro" — that's **correct**: cancel-at-period-end keeps access until the period ends. Confirm the "Access ends {date}" line is shown.
- If a customer says "I cancelled and immediately lost access unexpectedly" — check whether a **revoke-immediately** was used (rare, irreversible) or the period simply ended.

---

## Renewal

- Successful renewals are automatic; EmberFlow learns of them via `subscription.updated` (carries the new period dates). Nothing for support to do.
- "My renewal date is wrong / didn't update": have the customer reload `/app/subscriptions` (the page refetches on focus/back-navigation, but a renewal that happens while they sit on an idle open tab won't reflect until a refetch). If it's still wrong after reload, check the `subscriptions` row's `current_period_end` against the Polar dashboard.

---

## Cadence change (Monthly ↔ Yearly)

There is no in-place swap in EmberFlow (a deliberate scope choice — Polar *can* do it via API, EmberFlow doesn't wire it up to avoid custom proration). Tell the customer: **cancel the current plan** (keep Pro until it ends), then **subscribe to the other cadence** from the Subscriptions page once it does. No overlap, no double charge. The upgrade flow blocks starting a second subscription while one is active (returns a clear 409 message).

---

## Portal issues ("Manage billing does nothing / errors")

1. **"Couldn't open the billing portal: …"** — the real Polar error is now surfaced (not a generic string). Common causes: the org access token is missing the **customer_sessions (write)** scope (fix in Polar dashboard → Developers), or a stale `polar_customer_id` from an environment switch (the route auto-falls back to `external_customer_id`, so this usually self-heals).
2. **Portal button doesn't appear at all** — the customer has no Polar customer yet (never subscribed). Expected.
3. **Customer can't find their way back to EmberFlow from the portal** — Polar shows a "back to EmberFlow" link (we set `return_url`); they can also just navigate to the app. Returning updates their state automatically.

---

## Webhook replay / "my state looks wrong in the DB"

- EmberFlow dedupes webhooks by Polar's `webhook-id` (idempotent — a replayed event returns early, never double-applies).
- To force a re-sync of a customer whose row looks stale: in the Polar dashboard → Webhooks → the endpoint's delivery log, **resend** the latest `subscription.*` event for that customer. EmberFlow will re-upsert from the fresh payload.
- A `403` in the webhook delivery log = signature mismatch: the `POLAR_WEBHOOK_SECRET` in Vercel doesn't match the endpoint's signing secret (check the `sha256Prefix` in Vercel logs — see `POLAR_SETUP.md` troubleshooting), or the endpoint format isn't **Raw**.

---

## Escalation

Anything that looks like a **double charge, a charge with no corresponding `subscriptions` row, or entitlement that won't sync after a webhook resend** → escalate to engineering with the Polar `order_id`/`subscription_id`, the customer's account email, and the relevant Vercel function-log lines. Do not attempt manual `subscriptions` row edits in Supabase to "fix" entitlement — the webhook is the single source of truth and will overwrite manual edits on the next event.
