-- ============================================================
-- Migration 013: payments/proposal_items data integrity + RLS consolidation
--
-- Closes MF-4, MF-5, TD-7, and TD-9 from V2_MASTER_AUDIT.md (2026-08-06),
-- as scoped by V2_ROADMAP.md Phase 1 (Foundation: Data & Schema Integrity).
-- Read-only production preflight (queries + results recorded in that
-- session) confirmed zero rows violate any constraint added below and
-- zero currently-active past_due users own proposal_items, before this
-- file was written.
--
-- MF-4 — payments had zero CHECK constraints on financial columns; any
-- authenticated user going around the UI could insert a negative/zero
-- payment amount, corrupting createPayment's/deletePayment's client-side
-- paid-status arithmetic (services/api.js). Adds NOT NULL + CHECK
-- (amount > 0), mirroring the existing invoice_items_price_check /
-- invoices_status_check pattern. Deliberately does NOT add a payments
-- status CHECK — production has only ever held 'pending' (5/5 rows,
-- verified), but no code path sets any other value, so there is no
-- evidence for what the full intended enum should be. Tracked as
-- separate, deliberate follow-up work rather than guessed at here.
--
-- MF-5 — payments.invoice_id, payments.user_id, and
-- proposal_items.proposal_id are FK-referenced (ON DELETE CASCADE) and
-- hit on every invoice-detail / proposal-list load via embedded
-- PostgREST joins, but have no supporting index — sequential scans today,
-- a real slowdown as data accumulates. Adds the three missing indexes.
--
-- TD-7 — payments.amount and proposal_items.amount were unscaled
-- `numeric` (no precision/scale), unlike every sibling money column
-- (invoices.subtotal/tax_total/total are all numeric(12,2) NOT NULL).
-- invoices.discount_total was nullable, unlike those same siblings.
-- Backfills any NULL discount_total to 0 (verified zero rows need this
-- today) before adding NOT NULL, so the migration is safe even if that
-- changes before it runs.
--
-- TD-9 — proposal_items had two overlapping, differently-named RLS
-- policy sets (schema.sql's undated dump vs. migration 001's "are"-named
-- set), 8 policies for 4 operations. Not exploitable (permissive
-- policies OR together) but a real risk: migration 011
-- (2026-08-01) added 'past_due' to the "are"-named UPDATE/DELETE
-- policies only, leaving the other, non-"are" copies silently stale
-- (still active/trialing-only) — confirmed live via pg_policies during
-- the Phase 1 preflight. This consolidates both variants for all four
-- operations down to one canonical policy each. The UPDATE/DELETE
-- predicate is taken from migration 011 (the actual live, correct
-- behavior), NOT from schema.sql/policies.sql, which are stale per MF-6
-- and do not reflect 011's change. Zero currently-active past_due users
-- own proposal_items (verified), so this has no live-user impact either
-- way today — but the correct predicate must ship regardless, since a
-- past_due user can exist at any point after this migration lands.
--
-- Idempotent throughout (create/drop-if-exists guards on every
-- constraint/index/policy) so this file is safe to replay, consistent
-- with the pattern migrations 003/005 are being separately fixed to
-- follow (TD-6, tracked as a separate change, not part of this file).
--
-- NOT YET APPLIED to production as of this commit. See the companion
-- 013_payments_proposal_items_integrity_rollback.sql for the down path.
-- ============================================================

begin;

-- ============================================================
-- MF-4 — payments: NOT NULL + CHECK (amount > 0)
-- Status CHECK intentionally deferred — see header.
-- ============================================================

alter table public.payments
  alter column amount set not null;

alter table public.payments
  drop constraint if exists payments_amount_check;

alter table public.payments
  add constraint payments_amount_check
  check (amount > 0);

-- ============================================================
-- MF-5 — missing indexes on high-traffic FK columns
-- ============================================================

create index if not exists payments_invoice_id_idx
  on public.payments (invoice_id);

create index if not exists payments_user_id_idx
  on public.payments (user_id);

create index if not exists proposal_items_proposal_id_idx
  on public.proposal_items (proposal_id);

-- ============================================================
-- TD-7 — money-column precision/nullability
-- ============================================================

alter table public.payments
  alter column amount type numeric(12,2);

alter table public.proposal_items
  alter column amount type numeric(12,2);

update public.invoices
  set discount_total = 0
  where discount_total is null;

alter table public.invoices
  alter column discount_total set not null;

-- ============================================================
-- TD-9 — proposal_items RLS consolidation (8 policies -> 4)
-- UPDATE/DELETE predicate sourced from migration 011, preserving
-- past_due access. SELECT/INSERT predicates are owner-only in both
-- existing variants (no change in behavior, only de-duplication).
-- ============================================================

drop policy if exists "Proposal items viewable by proposal owner" on public.proposal_items;
drop policy if exists "Proposal items are viewable by proposal owner" on public.proposal_items;
create policy "Proposal items viewable by proposal owner" on public.proposal_items for select
using (
  exists (
    select 1 from public.proposals
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
  )
);

drop policy if exists "Proposal items insertable by proposal owner" on public.proposal_items;
drop policy if exists "Proposal items are insertable by proposal owner" on public.proposal_items;
create policy "Proposal items insertable by proposal owner" on public.proposal_items for insert
with check (
  exists (
    select 1 from public.proposals
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
  )
);

drop policy if exists "Proposal items updateable by active pro users" on public.proposal_items;
drop policy if exists "Proposal items are updateable by active pro users" on public.proposal_items;
create policy "Proposal items updateable by active pro users" on public.proposal_items for update
using (
  exists (
    select 1 from public.proposals
    join public.subscriptions on subscriptions.user_id = proposals.user_id
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
      and subscriptions.status in ('active', 'trialing', 'past_due')
  )
)
with check (
  exists (
    select 1 from public.proposals
    join public.subscriptions on subscriptions.user_id = proposals.user_id
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
      and subscriptions.status in ('active', 'trialing', 'past_due')
  )
);

drop policy if exists "Proposal items deletable by active pro users" on public.proposal_items;
drop policy if exists "Proposal items are deletable by active pro users" on public.proposal_items;
create policy "Proposal items deletable by active pro users" on public.proposal_items for delete
using (
  exists (
    select 1 from public.proposals
    join public.subscriptions on subscriptions.user_id = proposals.user_id
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
      and subscriptions.status in ('active', 'trialing', 'past_due')
  )
);

commit;
