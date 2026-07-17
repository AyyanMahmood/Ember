-- ============================================================
-- Migration: Production blocker fixes
-- 
-- 1. Add missing columns to payments table
-- 2. Add missing Paddle columns to subscriptions table
-- 3. Create webhook_events table for idempotency
-- 4. Add RLS policies for payments (missing from schema.sql)
-- 5. Fix proposal RLS policies to match schema.sql
-- 6. Add missing proposal_items UPDATE policy
--
-- Safe to run on existing production database.
-- All ADD COLUMN statements use IF NOT EXISTS.
-- All CREATE POLICY statements use DROP POLICY IF EXISTS first.
-- ============================================================

begin;

-- ============================================================
-- 1. Payments table — add columns the frontend sends/displays
-- ============================================================
-- The schema.sql only defined: id, invoice_id, user_id, amount,
-- status, created_at. But the frontend sends currency, payment_date,
-- method, reference, notes. Without these, every payment creation
-- from the UI fails with "column does not exist".
-- ============================================================

alter table public.payments
  add column if not exists currency text default 'USD'::text;

alter table public.payments
  add column if not exists payment_date date;

alter table public.payments
  add column if not exists method text default 'manual'::text;

alter table public.payments
  add column if not exists reference text;

alter table public.payments
  add column if not exists notes text;

-- ============================================================
-- 2. Subscriptions table — add Paddle integration columns
-- ============================================================
-- checkout.js writes billing_cycle and paddle_customer_id.
-- portal.js reads paddle_customer_id and paddle_subscription_id.
-- webhook.js upserts all columns via normalizeSubscriptionPayload.
-- Without these, the entire Paddle integration fails silently.
-- ============================================================

alter table public.subscriptions
  add column if not exists billing_cycle text default 'free'::text;

alter table public.subscriptions
  add column if not exists paddle_customer_id text;

alter table public.subscriptions
  add column if not exists paddle_subscription_id text;

alter table public.subscriptions
  add column if not exists paddle_price_id text;

alter table public.subscriptions
  add column if not exists paddle_product_id text;

alter table public.subscriptions
  add column if not exists current_period_start timestamp with time zone;

alter table public.subscriptions
  add column if not exists current_period_end timestamp with time zone;

alter table public.subscriptions
  add column if not exists cancel_at_period_end boolean default false;

alter table public.subscriptions
  add column if not exists trial_ends_at timestamp with time zone;

-- ============================================================
-- 3. Webhook events table — webhook idempotency
-- ============================================================
-- Tracks processed Paddle event_ids so duplicate webhook
-- deliveries (at-least-once) are silently acknowledged
-- without re-processing or corrupting subscription state.
-- ============================================================

create table if not exists public.webhook_events (
  id text not null,
  event_type text not null,
  processed_at timestamp with time zone default now() not null
);

-- Safeguard: add PK only if the table was just created or if
-- the PK constraint is somehow missing (idempotent via DO block).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.webhook_events'::regclass
      and conname = 'webhook_events_pkey'
  ) then
    alter table public.webhook_events add primary key (id);
  end if;
end
$$;

alter table public.webhook_events enable row level security;

-- Grant access so the admin client (service_role) can read/write
-- and so anon/authenticated roles have a consistent setup.
grant all on table public.webhook_events to anon;
grant all on table public.webhook_events to authenticated;
grant all on table public.webhook_events to service_role;

-- ============================================================
-- 4. Payments RLS policies
-- ============================================================
-- The pg_dump (schema.sql) had RLS enabled on payments but zero
-- policies — meaning every operation was denied. Add SELECT,
-- INSERT, UPDATE, DELETE policies matching the pattern used
-- by other tables. INSERT checks invoice ownership.
-- ============================================================

drop policy if exists "Payments are viewable by owner" on public.payments;
create policy "Payments are viewable by owner" on public.payments for select
using (auth.uid() = user_id);

drop policy if exists "Payments are insertable by owner" on public.payments;
create policy "Payments are insertable by owner" on public.payments for insert
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.invoices
    where invoices.id = payments.invoice_id
      and invoices.user_id = auth.uid()
  )
);

drop policy if exists "Payments are updateable by owner" on public.payments;
create policy "Payments are updateable by owner" on public.payments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Payments are deletable by owner" on public.payments;
create policy "Payments are deletable by owner" on public.payments for delete
using (auth.uid() = user_id);

-- ============================================================
-- 5. Proposals RLS policies — add Pro subscription gates
-- ============================================================
-- The standalone policies.sql allowed free users to UPDATE and
-- DELETE proposals (owner-only check). The actual database
-- (schema.sql) requires an active Pro subscription. Align
-- policies.sql to match the database. The BEFORE INSERT trigger
-- (enforce_proposals_pro_only) already blocks free inserts;
-- UPDATE and DELETE should be gated the same way.
-- ============================================================

drop policy if exists "Proposals are updateable by owner" on public.proposals;
drop policy if exists "Proposals are updateable by active pro users" on public.proposals;
create policy "Proposals are updateable by active pro users" on public.proposals for update
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.subscriptions
    where subscriptions.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
      and subscriptions.status in ('active', 'trialing')
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.subscriptions
    where subscriptions.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
      and subscriptions.status in ('active', 'trialing')
  )
);

drop policy if exists "Proposals are deletable by owner" on public.proposals;
drop policy if exists "Proposals are deletable by active pro users" on public.proposals;
create policy "Proposals are deletable by active pro users" on public.proposals for delete
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.subscriptions
    where subscriptions.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
      and subscriptions.status in ('active', 'trialing')
  )
);

-- ============================================================
-- 6. Proposal items RLS policies — add missing UPDATE;
--    restrict DELETE to Pro users
-- ============================================================
-- policies.sql was missing an UPDATE policy entirely (every
-- update was denied) and had a DELETE policy allowing free users.
-- Match schema.sql: UPDATE and DELETE require Pro subscription;
-- SELECT and INSERT remain owner-only checks.
-- ============================================================

drop policy if exists "Proposal items are viewable by proposal owner" on public.proposal_items;
create policy "Proposal items are viewable by proposal owner" on public.proposal_items for select
using (
  exists (
    select 1 from public.proposals
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
  )
);

drop policy if exists "Proposal items are insertable by proposal owner" on public.proposal_items;
create policy "Proposal items are insertable by proposal owner" on public.proposal_items for insert
with check (
  exists (
    select 1 from public.proposals
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
  )
);

drop policy if exists "Proposal items are updateable by owner" on public.proposal_items;
drop policy if exists "Proposal items are updateable by active pro users" on public.proposal_items;
create policy "Proposal items are updateable by active pro users" on public.proposal_items for update
using (
  exists (
    select 1 from public.proposals
    join public.subscriptions on subscriptions.user_id = proposals.user_id
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
      and subscriptions.status in ('active', 'trialing')
  )
)
with check (
  exists (
    select 1 from public.proposals
    join public.subscriptions on subscriptions.user_id = proposals.user_id
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
      and subscriptions.status in ('active', 'trialing')
  )
);

drop policy if exists "Proposal items are deletable by owner" on public.proposal_items;
drop policy if exists "Proposal items are deletable by active pro users" on public.proposal_items;
create policy "Proposal items are deletable by active pro users" on public.proposal_items for delete
using (
  exists (
    select 1 from public.proposals
    join public.subscriptions on subscriptions.user_id = proposals.user_id
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
      and subscriptions.status in ('active', 'trialing')
  )
);

commit;
