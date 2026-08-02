-- ============================================================
-- Migration 012: Production-grade account deletion
--
-- EmberFlow had no way for a user to permanently delete their account —
-- unacceptable for a SaaS holding client PII, invoices, and payment
-- records. This adds a single, atomic, server-only RPC that deletes every
-- row a user owns across the schema, in FK-safe order, inside one
-- transaction (a plpgsql function body is atomic: any error rolls the
-- whole thing back, so a failure never leaves partial deletion behind).
--
-- Security model (mirrors why this can't just be 8 client-side .delete()
-- calls): several tables gate DELETE behind an active-Pro-subscription RLS
-- check (see policies.sql / migration 001 — "Proposals are deletable by
-- active pro users", "Proposal items deletable by active pro users"). A
-- Free user, or a Pro user whose subscription has lapsed, could not
-- actually delete their own proposals/proposal_items through the normal
-- RLS-scoped client — the policy would silently filter the DELETE to zero
-- rows, leaving orphaned data behind after an apparently "successful"
-- deletion. This function is SECURITY DEFINER (bypasses RLS, as it must,
-- to guarantee complete deletion regardless of plan/status) and is
-- reachable ONLY by service_role (see grants at the bottom) — never by
-- anon/authenticated. The API endpoint that calls it (api/account/delete.js)
-- independently verifies the caller's identity via their JWT and always
-- passes that verified id, never a client-supplied one, so there is no path
-- for a user to delete anyone's data but their own.
--
-- Deletion order is explicit (children before parents), not left to
-- inferred ON DELETE CASCADE behavior, so correctness doesn't depend on
-- every current and future FK's cascade action being exactly right:
--   invoice_items    (child of invoices)
--   payments         (own user_id column; also references invoices)
--   invoices         (references clients — must go before clients)
--   proposal_items   (child of proposals)
--   proposals
--   clients
--   invoice_usage
--   subscriptions
--   profiles         (last — nothing else references it)
--
-- webhook_events is intentionally NOT touched: it has no user_id column at
-- all (it's a global Polar-event-id idempotency ledger, id = Polar's event
-- id), so there is no per-user row to delete there.
--
-- MAINTENANCE — read this before adding a new table:
-- Any new table that stores per-user data (a `user_id` column, or any
-- column that ultimately traces back to a user) MUST be added to this
-- function, in an order that deletes it before whatever it references and
-- after whatever references it. This function does not discover new
-- tables automatically — a hand-maintained, explicit, reviewable list was
-- chosen over dynamic information_schema introspection, which would hide
-- exactly this kind of change from code review and can't infer the correct
-- delete order on its own.
--
-- Safe to run on the existing production database: purely additive (one
-- new function), nothing dropped or altered.
-- ============================================================

begin;

create or replace function public.delete_user_account(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_invoice_items integer;
  v_payments integer;
  v_invoices integer;
  v_proposal_items integer;
  v_proposals integer;
  v_clients integer;
  v_invoice_usage integer;
  v_subscriptions integer;
  v_profiles integer;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required.';
  end if;

  delete from public.invoice_items
  where invoice_id in (select id from public.invoices where user_id = p_user_id);
  get diagnostics v_invoice_items = row_count;

  delete from public.payments where user_id = p_user_id;
  get diagnostics v_payments = row_count;

  delete from public.invoices where user_id = p_user_id;
  get diagnostics v_invoices = row_count;

  delete from public.proposal_items
  where proposal_id in (select id from public.proposals where user_id = p_user_id);
  get diagnostics v_proposal_items = row_count;

  delete from public.proposals where user_id = p_user_id;
  get diagnostics v_proposals = row_count;

  delete from public.clients where user_id = p_user_id;
  get diagnostics v_clients = row_count;

  delete from public.invoice_usage where user_id = p_user_id;
  get diagnostics v_invoice_usage = row_count;

  delete from public.subscriptions where user_id = p_user_id;
  get diagnostics v_subscriptions = row_count;

  delete from public.profiles where id = p_user_id;
  get diagnostics v_profiles = row_count;

  return jsonb_build_object(
    'invoice_items', v_invoice_items,
    'payments', v_payments,
    'invoices', v_invoices,
    'proposal_items', v_proposal_items,
    'proposals', v_proposals,
    'clients', v_clients,
    'invoice_usage', v_invoice_usage,
    'subscriptions', v_subscriptions,
    'profiles', v_profiles
  );
end;
$$;

alter function public.delete_user_account(uuid) owner to postgres;

-- Reachable only by the service-role backend (api/account/delete.js),
-- which has already independently verified the caller's own identity.
-- Never grant this to anon/authenticated — it is SECURITY DEFINER and
-- bypasses RLS by design, so client-side access would let any signed-in
-- user delete any other user's data by simply passing a different uuid.
revoke all on function public.delete_user_account(uuid) from public;
revoke all on function public.delete_user_account(uuid) from anon;
revoke all on function public.delete_user_account(uuid) from authenticated;
grant execute on function public.delete_user_account(uuid) to service_role;

commit;
