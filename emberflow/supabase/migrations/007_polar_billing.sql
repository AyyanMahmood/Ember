-- ============================================================
-- Migration 007: Polar.sh billing columns
--
-- Adds Polar equivalents of the paddle_* subscription columns as
-- part of the Paddle -> Polar payment-provider migration.
--
-- Additive and non-destructive by design: the legacy paddle_*
-- columns are intentionally left in place (they still hold the
-- historical customer/subscription linkage) and are dropped only
-- as a separate, explicitly-approved step AFTER Polar is verified
-- live in production. See POLAR_SETUP.md -> "Decommissioning Paddle".
--
-- The provider-agnostic columns this integration relies on
-- (plan, status, billing_cycle, current_period_start/end,
-- cancel_at_period_end, trial_ends_at) already exist from
-- migration 001 and are reused unchanged. Only the Polar-specific
-- identifier columns are new here.
--
-- Safe to run on the existing production database:
--   - every ADD COLUMN uses IF NOT EXISTS
--   - every CREATE INDEX uses IF NOT EXISTS
--   - nothing is dropped, renamed, or back-filled
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Polar identifier columns on subscriptions
-- ------------------------------------------------------------
-- polar_customer_id      -> used to open the customer billing
--                           portal (POST /v1/customer-sessions/).
-- polar_subscription_id  -> used to reconcile a webhook event to
--                           an existing subscription row.
-- polar_product_id       -> the Polar product the subscription is
--                           for; audited and mapped back to a plan.
-- ------------------------------------------------------------
alter table public.subscriptions
  add column if not exists polar_customer_id text;

alter table public.subscriptions
  add column if not exists polar_subscription_id text;

alter table public.subscriptions
  add column if not exists polar_product_id text;

-- ------------------------------------------------------------
-- Lookup indexes for webhook user-resolution fallbacks
-- ------------------------------------------------------------
-- The webhook prefers the external_customer_id (Supabase user id)
-- carried on the Polar payload, but falls back to matching an
-- existing row by subscription id or customer id when it isn't
-- present. Index both fallback lookups.
-- ------------------------------------------------------------
create index if not exists subscriptions_polar_subscription_id_idx
  on public.subscriptions (polar_subscription_id);

create index if not exists subscriptions_polar_customer_id_idx
  on public.subscriptions (polar_customer_id);

commit;
