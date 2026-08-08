-- ============================================================
-- Rollback for migration 013 (payments/proposal_items integrity + RLS
-- consolidation).
--
-- NOT part of the normal forward-migration sequence — this file is never
-- run automatically and has no number prefix for that reason. Run it
-- manually, only if 013 needs to be reverted after being applied.
--
-- Reverses each change independently; safe to run even if only some of
-- 013's statements ended up applied (every clause here uses IF EXISTS /
-- is naturally idempotent), though 013 itself is a single transaction so
-- that partial-apply case should not occur in practice.
--
-- RLS note: this does NOT attempt to recreate the original duplicate
-- 8-policy mess (schema.sql's non-"are" set + migration 001/011's
-- "are"-named set) — that duplication was itself a defect (TD-9), not a
-- state worth restoring. Reverting RLS here means returning to a single
-- canonical policy per operation with the pre-011 (active/trialing only,
-- no past_due) predicate, i.e. undoing 013's consolidation but not
-- reintroducing the duplication. If migration 011's past_due fix needs
-- to be preserved even after a 013 rollback, do not run the RLS section
-- below — only the constraint/index/column sections.
-- ============================================================

begin;

-- ============================================================
-- Revert TD-9 — proposal_items RLS
-- ============================================================

drop policy if exists "Proposal items viewable by proposal owner" on public.proposal_items;
create policy "Proposal items viewable by proposal owner" on public.proposal_items for select
using (
  exists (
    select 1 from public.proposals
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
  )
);

drop policy if exists "Proposal items insertable by proposal owner" on public.proposal_items;
create policy "Proposal items insertable by proposal owner" on public.proposal_items for insert
with check (
  exists (
    select 1 from public.proposals
    where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
  )
);

drop policy if exists "Proposal items updateable by active pro users" on public.proposal_items;
create policy "Proposal items updateable by active pro users" on public.proposal_items for update
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

drop policy if exists "Proposal items deletable by active pro users" on public.proposal_items;
create policy "Proposal items deletable by active pro users" on public.proposal_items for delete
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

-- ============================================================
-- Revert TD-7 — money-column precision/nullability
-- Widening a column's type/nullability is always safe; no data loss.
-- ============================================================

alter table public.invoices
  alter column discount_total drop not null;

alter table public.proposal_items
  alter column amount type numeric;

alter table public.payments
  alter column amount type numeric;

-- ============================================================
-- Revert MF-5 — indexes
-- ============================================================

drop index if exists public.proposal_items_proposal_id_idx;
drop index if exists public.payments_user_id_idx;
drop index if exists public.payments_invoice_id_idx;

-- ============================================================
-- Revert MF-4 — payments CHECK + NOT NULL
-- ============================================================

alter table public.payments
  drop constraint if exists payments_amount_check;

alter table public.payments
  alter column amount drop not null;

commit;
