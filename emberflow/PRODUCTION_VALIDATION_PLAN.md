# EmberFlow — Production Validation Plan (Phase 3)

**Purpose:** prove EmberFlow is production-ready by executing real workflows against a real Polar account — not more theory. This is the script to run; `BILLING_QA_CHECKLIST.md` is the deeper per-flow reference, `PRODUCTION_CHECKLIST.md` is the pre-flight config, `SUPPORT_PLAYBOOK.md` is post-launch ops.

**How to use:** run **P0** in Polar **sandbox** first, then re-run P0's happy paths once in **production** with a real card. P1 before public launch. P2 as time allows. Record the actual observed Polar/Supabase/UI/log state next to each — if any diverges from "Expected," stop and root-cause (do not "fix" by hand-editing Supabase; the webhook is the source of truth).

**Where to look during a test:**
- **Polar state** → Polar dashboard → Subscriptions / Orders / Webhooks-delivery-log
- **Supabase state** → the `subscriptions` row for the test user (+ `webhook_events`)
- **EmberFlow UI** → `/app/subscriptions` (and any Pro-gated page for entitlement)
- **Logs** → Vercel → the function's logs (`api/polar/*`)
- **Webhook** → Polar dashboard → Webhooks → endpoint → delivery log (HTTP status per event)

---

## Priority grouping

- **P0 — Launch blockers.** Money moves or entitlement changes. Must pass in sandbox *and* production before taking real customers.
- **P1 — Must verify before launch.** Real but lower-frequency paths; failure is recoverable but visible.
- **P2 — Nice to verify.** Edge/operational scenarios; unlikely at launch volume.

---

# BILLING VALIDATION

## P0 scenarios

### P0.1 — New Monthly purchase
| Dimension | Expected |
|---|---|
| Polar | New subscription, product = Pro Monthly, status `active` |
| Supabase | `subscriptions` row: `plan=pro_monthly`, `status=active`, `billing_cycle=monthly`, `polar_customer_id`/`polar_subscription_id`/`polar_product_id` set, `current_period_start/end` set, `cancel_at_period_end=false` |
| UI | Redirect to `/app/subscriptions?billing=success` → "Confirming your purchase…" briefly → Pro plan hero, "Manage billing" button, Pro features unlocked |
| Logs | No error lines; `checkout` route returned a URL |
| Webhook | `subscription.created` and/or `subscription.active` deliver `200` |
| Verify ✓ | Pro unlocks with no manual refresh; row matches; `?billing=success` param stripped from URL |

### P0.2 — New Yearly purchase
Same as P0.1 with `plan=pro_yearly`, `billing_cycle=yearly`, product = Pro Yearly, price $130.

### P0.3 — Duplicate purchase (already Pro)
| Dimension | Expected |
|---|---|
| Polar | **No** second subscription created |
| Supabase | Unchanged (still one row) |
| UI | Upgrade CTA is not shown while Pro (the "Switch billing cadence" card is shown instead); a direct `POST /api/polar/checkout` returns **409** with the "already have an active subscription" message |
| Logs | `checkout` route logs the 409 path (no Polar checkout created) |
| Webhook | None |
| Verify ✓ | Only one subscription in Polar; 409 body is the user-actionable message, not a generic error |

### P0.4 — Cancellation (from Polar portal)
| Dimension | Expected |
|---|---|
| Polar | Subscription stays `active`, `cancel_at_period_end=true` |
| Supabase | Row: `status=active`, `cancel_at_period_end=true`, `plan` unchanged (still Pro) |
| UI | "Access ends {date}" subtitle, cancel notice ("keep Pro until…"), Pro still works |
| Logs | `subscription.updated`/`canceled` processed, no error |
| Webhook | `subscription.canceled` (and/or `updated`) → `200` |
| Verify ✓ | User keeps Pro; UI shows the cancelling state; row flag flipped |

### P0.5 — Return from Polar portal
| Dimension | Expected |
|---|---|
| Polar | n/a (navigation) |
| Supabase | Already updated by the webhook |
| UI | Portal shows a "back to EmberFlow" link (from `return_url`); clicking it lands on `/app/subscriptions` showing the **new** state. Also test the **browser back button** and a **second-tab** return — all three reflect the change without a manual reload |
| Logs | n/a |
| Webhook | n/a |
| Verify ✓ | No stale "still Pro / still active" state after any of the three return paths (this was the historical bug — fixed via `return_url` + pageshow/visibilitychange refetch) |

### P0.6 — Expiration (cancel-at-period-end reaches period end)
| Dimension | Expected |
|---|---|
| Polar | Subscription revoked, status `canceled`, benefits revoked |
| Supabase | Row: `plan=free`, `status=canceled` (subscription id retained for history) |
| UI | Free plan hero; Pro features re-locked; "Upgrade to Pro" card returns |
| Logs | `subscription.revoked` processed |
| Webhook | `subscription.revoked` → `200` |
| Verify ✓ | Access drops to Free cleanly; `current_period_end` still reflects the last real period (not nulled) |

### P0.7 — Environment mismatch (config safety)
| Dimension | Expected |
|---|---|
| Polar | n/a — this tests EmberFlow's guard, not Polar |
| Supabase | If `POLAR_PRODUCT_PRO_*` don't match the live product ids, an active sub's `plan` derives to `free` (defensive) |
| UI | User would show Free despite paying |
| Logs | (No explicit error — silent derive) |
| Verify ✓ | **Before launch:** confirm the production `POLAR_PRODUCT_PRO_MONTHLY/YEARLY` env vars exactly equal the production product ids. This is the single most dangerous misconfiguration — see the Config Audit below |

## P1 scenarios

### P1.1 — Upgrade / cadence switch (Monthly ↔ Yearly)
| Dimension | Expected |
|---|---|
| Polar | Old sub cancelled (period-end) then a new sub of the other cadence after it ends |
| Supabase | Reflects the currently-active cadence; never two Pro rows |
| UI | "Switch billing cadence" card explains cancel-then-resubscribe; no false "Polar can't do this" claim (fixed) |
| Verify ✓ | No double-charge, no overlapping subscriptions; 409 blocks a second checkout while the first is still active |

### P1.2 — Failed payment → `past_due`
| Dimension | Expected |
|---|---|
| Polar | Status `active` → `past_due`, `past_due_at` set; dunning email sent to customer |
| Supabase | Row: `status=past_due`, `plan` still Pro (`past_due` grants access) |
| UI | Warning "Past due" badge, "Payment failed — please update your card" subtitle, explanatory notice; **Pro still works** |
| Logs | `subscription.past_due`/`updated` processed |
| Webhook | `subscription.updated` (status past_due) → `200` |
| Verify ✓ | User keeps Pro and sees the clear failed-payment messaging (not a silent healthy-looking Pro) |

### P1.3 — Retry payment succeeds (`past_due` → `active`)
| Dimension | Expected |
|---|---|
| Polar | Retry succeeds, status back to `active` |
| Supabase | Row: `status=active`, past_due cleared |
| UI | Back to normal "Renews {date}"; notice gone |
| Verify ✓ | No leftover past_due artifacts after recovery |

### P1.4 — Grace period (15-day policy)
| Dimension | Expected |
|---|---|
| Polar | Grace set to 21 days (so Polar's own revocation doesn't precede the 15-day commitment) |
| Supabase | Row stays Pro throughout `past_due` |
| UI | Pro retained for the whole retry window |
| Verify ✓ | Customer keeps access ≥15 days after first failure (EmberFlow grants through the whole past_due window, ~21 days — see SUPPORT_PLAYBOOK Grace Period) |

### P1.5 — Expiration after exhausted retries (`past_due` → revoked)
Same end-state as P0.6 but reached via 4 failed retries. Verify the transition to Free is clean and only happens after retries are exhausted, not on the first failure.

### P1.6 — Webhook replay / idempotency
| Dimension | Expected |
|---|---|
| Polar | Resend the same event from the delivery log |
| Supabase | Row unchanged by the replay |
| UI | Unchanged |
| Logs | (none needed) |
| Webhook | 2nd delivery → `200` with `{received:true, duplicate:true}` |
| Verify ✓ | No double-apply, no date reset, no access change on replay (`webhook_events` dedup by `webhook-id`) |

### P1.7 — Webhook signature failure
| Dimension | Expected |
|---|---|
| Polar | (simulate: wrong secret, or Polar sends to a mis-secreted endpoint) |
| Supabase | No change (rejected before processing) |
| Logs | `Polar webhook signature verification failed: <reason>` with header presence + `sha256Prefix` fingerprint |
| Webhook | Delivery → `403` |
| Verify ✓ | 403 on bad signature; the log names the exact cause (missing headers / stale timestamp / no matching signature) — proven by `verify:polar` (31/31), confirm live secret matches |

## P2 scenarios

### P2.1 — Deleted subscription (edited/removed directly in Polar dashboard)
| Expected | `resolveUserId()` falls back (external_id → `polar_subscription_id` → `polar_customer_id`) and still resolves the EmberFlow user; whatever event Polar fires is processed generically. If Polar fires no event, the row simply goes stale (no event = nothing to react to — a known silent gap, candidate for a periodic reconciliation job in v1.5). |

### P2.2 — Deleted customer (removed in Polar)
| Expected | Same fallback resolution. A fully-deleted customer with no webhook leaves the row stale; not fixable in the handler (nothing to react to). Verify no crash on any event that *does* arrive with a missing `customer.external_id`. |

---

# PRODUCTION CONFIGURATION AUDIT

Only genuine risks are listed. "Code-set" = verified from source this phase; "Dashboard" = must be confirmed live (cannot be verified from code).

| Item | Source of truth | Status / Risk |
|---|---|---|
| **`POLAR_PRODUCT_PRO_MONTHLY/YEARLY`** | Dashboard → Vercel env | 🔴 **Highest-risk config.** If these don't equal the live product ids, active subscribers derive to Free silently (`planFromProduct` returns `free`). Verify against production product ids specifically. |
| **`POLAR_SERVER`** | Vercel env | 🔴 Must be `production` for live. `POLAR_ENVIRONMENT` is accepted as a warned fallback — don't use it. |
| **`POLAR_ACCESS_TOKEN` scopes** | Dashboard | 🟠 Must include **customer_sessions (write)** or the portal 403s. checkouts (write) + customers/products (read) also needed. |
| **`POLAR_WEBHOOK_SECRET`** | Dashboard → Vercel env | 🔴 Must match the production endpoint's signing secret exactly (code trims whitespace). Verify via the `sha256Prefix` in logs on a test delivery. Sandbox and prod have different secrets. |
| **Webhook endpoint format + events** | Dashboard | 🔴 **Raw** format; all six `subscription.*` events selected. Wrong format or missing events = silent entitlement drift. |
| **Grace period** | Dashboard | 🟠 Set to **21 days** (satisfies the 15-day policy). Default "Immediately" would make Polar's dunning emails contradict EmberFlow keeping Pro. |
| **`APP_URL`** | Vercel env | 🔴 Drives CORS (fail-closed if unset), `success_url`, `return_url`. Must equal the live domain. |
| **success_url** | Code-set: `${APP_URL}/app/subscriptions?billing=success` | ✅ Correct and read by the confirming-purchase handler. |
| **return_url** | Code-set: `${APP_URL}/app/subscriptions` | ✅ Set on both portal-session attempts (fixed `1b27012`). |
| **cancel_url** | Not set | 🟢 Low/none. Polar's hosted checkout has no separate cancel_url in its create body; an abandoned checkout is handled by the customer navigating back. No action needed, noted for completeness. |
| **Support URL/email** | Code: `support@emberflow.com` (`company.js`) | 🟢 Confirm the inbox is monitored and the address is real before launch. |
| **Rate limiting** | Code: checkout 5/min, portal 5/min, **webhook 60/min** (per-IP) | 🟠 Rate-limiting the *webhook* is unusual. At launch volume 60/min/IP is ample; a large burst (mass renewal) could 429 legitimate deliveries — Polar retries 429s so it self-heals, but consider raising/exempting the webhook route if volume grows. Fails **open** if Redis is down. |
| **Authentication** | Google OAuth production-verified; email/password via Supabase | 🟢 Re-confirm OAuth callback/origins match the final domain. |
| **Migration 007 applied** | Supabase prod | 🔴 Confirm the three `polar_*` columns exist by direct column check (not `migration list`). |

---

# LAUNCH GO / NO-GO DECISION

## 🔴 NO-GO for a real-money public launch **today.**

**Not because anything is known-broken** — the billing code is correct, minimal, idempotent, and has survived five deep audits with six bugs fixed. It is NO-GO for exactly one reason class: **nothing above has been executed against a real Polar account, and the production configuration is unconfirmed.** A finance product cannot launch on code confidence alone.

**Conditions to flip to GO (all are verification/config, not engineering — est. 1–2 days):**
1. P0.1–P0.7 pass in **sandbox**, then P0.1/P0.2/P0.4/P0.6 pass once in **production** with a real card (refunded after).
2. Every 🔴 row in the Config Audit confirmed live.
3. Migration 007 confirmed present in the production DB.
4. The 🟠 rows (token scope, grace period, webhook rate limit awareness) reviewed.

**Already GO-quality (no further work needed):** the code, the architecture, the entitlement logic, the security posture (RLS, signature verify, CORS fail-closed), and the documentation.

**Interim option:** EmberFlow can go live in a **Free-tier-only** posture immediately (billing is optional — with no `POLAR_*` vars every account stays Free and the rest of the app works). That de-risks a soft launch while the live billing validation is completed. This is a genuine option, not a workaround.
