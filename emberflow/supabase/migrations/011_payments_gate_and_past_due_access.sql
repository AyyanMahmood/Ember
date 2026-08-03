-- ============================================================
-- Migration: Add a server-side Pro gate for payment tracking; make the
-- proposals/proposal_items UPDATE+DELETE RLS agree with the app's own
-- "past_due keeps full Pro access" policy (final launch hardening
-- security/correctness audit, 2026-08-01)
--
-- Bug 1 (security, Free-tier billing bypass): "Payment tracking" is a
-- documented Pro-only feature (frontend/src/config/plans.js), gated only
-- in the UI (InvoiceDetailPage.jsx). Unlike proposals/branding, there was
-- no database backstop, so a Free user calling
-- supabase.from('payments').insert(...) directly against their own
-- invoice would succeed under the existing owner-only RLS. Fixed with a
-- trigger mirroring the existing enforce_proposals_pro_only pattern.
-- Deliberately INSERT-only: deleting a payment you already recorded stays
-- allowed regardless of plan, matching the app's existing "removing your
-- own data is never Pro-gated" precedent (see 006_brand_studio_free_tier,
-- which leaves logo deletion unrestricted on downgrade).
--
-- Bug 2 (correctness, contradicts a documented, user-facing promise): the
-- proposals/proposal_items UPDATE and DELETE RLS policies
-- (001_production_fixes.sql) require subscriptions.status in
-- ('active','trialing') -- excluding 'past_due'. This disagrees with the
-- app's own repeated, explicit policy that a past_due subscription keeps
-- full Pro access while Polar retries the charge (api/_utils/polar.js's
-- ACCESS_GRANTING_STATUSES, frontend/src/utils/plans.js's identical copy,
-- and the literal on-screen promise in SubscriptionsPage.jsx: "You keep
-- full Pro access while Polar automatically retries the charge"). A Pro
-- user whose renewal fails could see and create proposals (gated only on
-- plan, via enforce_proposals_pro_only, which already agrees) but silently
-- fail to update or delete them -- .delete() with no matching row raises
-- no error, so the UI would show the delete as having succeeded. Fixed by
-- adding 'past_due' to the status list, matching ACCESS_GRANTING_STATUSES
-- exactly. INSERT is untouched (enforce_proposals_pro_only already only
-- checks plan, already correct).
--
-- Safe to run on existing production database. Both changes are strictly
-- additive/loosening for legitimate access -- neither can grant access to
-- anyone who wasn't already entitled to it under the app's own rules.
-- ============================================================

begin;

create or replace function public.enforce_payments_pro_only() returns trigger
    language plpgsql security definer
    set search_path to 'public'
    as $$
declare
  v_plan text;
begin

  select plan
  into v_plan
  from public.subscriptions
  where user_id = new.user_id
  limit 1;

  if coalesce(v_plan, 'free') = 'free' then
    raise exception 'Pro subscription required for payment tracking.';
  end if;

  return new;

end;
$$;

drop trigger if exists enforce_payments_pro_only_trigger on public.payments;

create trigger enforce_payments_pro_only_trigger
  before insert on public.payments
  for each row execute function public.enforce_payments_pro_only();

drop policy if exists "Proposals are updateable by active pro users" on public.proposals;
create policy "Proposals are updateable by active pro users" on public.proposals for update
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.subscriptions
    where subscriptions.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
      and subscriptions.status in ('active', 'trialing', 'past_due')
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.subscriptions
    where subscriptions.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
      and subscriptions.status in ('active', 'trialing', 'past_due')
  )
);

drop policy if exists "Proposals are deletable by active pro users" on public.proposals;
create policy "Proposals are deletable by active pro users" on public.proposals for delete
using (
  auth.uid() = user_id
  and exists (
    select 1 from public.subscriptions
    where subscriptions.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
      and subscriptions.status in ('active', 'trialing', 'past_due')
  )
);

drop policy if exists "Proposal items are updateable by active pro users" on public.proposal_items;
create policy "Proposal items are updateable by active pro users" on public.proposal_items for update
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

drop policy if exists "Proposal items are deletable by active pro users" on public.proposal_items;
create policy "Proposal items are deletable by active pro users" on public.proposal_items for delete
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
