-- ============================================================
-- Migration 015: atomic update_invoice_with_items(uuid, jsonb, jsonb)
--
-- Closes MF-3 from V2_MASTER_AUDIT.md / the Pre-Visual-V2 audit (2026-08-10).
--
-- Root cause: frontend/src/services/api.js's updateInvoice() performed the
-- invoice edit as three separate client round-trips -- UPDATE invoices,
-- DELETE invoice_items, then INSERT the new invoice_items -- with no
-- transaction tying them together. A failure between the DELETE and the
-- INSERT (network drop, a constraint violation on one malformed item,
-- etc.) left a real invoice permanently holding zero line items while its
-- subtotal/tax_total/total still reflected the intended new items -- a
-- financial document with a total but nothing backing it.
--
-- create_invoice_with_items(jsonb, jsonb) (present since the initial
-- schema, most recently redefined by migration 010) already solves this
-- exact problem for invoice creation: the whole insert (usage-limit check,
-- invoice row, item rows) runs inside a single plpgsql function body, so
-- Postgres either commits all of it or none of it. This migration adds a
-- sibling function for update, modeled directly on it, so the same
-- guarantee applies to editing an existing invoice.
--
-- Column list, casts, and defaults for the invoices SET clause are copied
-- verbatim from create_invoice_with_items's current (migration 010) INSERT
-- column list, with two deliberate differences:
--   - user_id is never written (an update never changes ownership; the
--     row to update is selected by id alone and RLS's owner-only USING
--     clause is what actually restricts which row can be touched -- same
--     trust boundary create_invoice_with_items uses for client_id
--     ownership, enforced by the INSERT policy's WITH CHECK rather than by
--     a manual check in the function body).
--   - sent_at/paid_at are never written, matching the CURRENT behavior of
--     the plain `.update(invoice)` call this replaces: neither existing
--     caller (InvoiceFormPage.jsx's save, InvoiceDetailPage.jsx's
--     changeTemplate) has ever included those keys in its payload, so
--     they were never touched by an edit before this change either --
--     only updateInvoiceStatus() (a separate, untouched function) sets
--     them. Preserving that is required by the "preserve exact external
--     behavior" scope for this fix.
-- updated_at is likewise left unset here -- invoices_set_updated_at
-- already runs BEFORE UPDATE ON invoices and sets it unconditionally, so
-- setting it again in this function would be redundant.
--
-- Template Pro-gating is NOT duplicated in this function (unlike
-- create_invoice_with_items, which does its own belt-and-suspenders
-- v_plan/v_free_template_ids check in addition to the trigger). That
-- manual check is unnecessary here because
-- enforce_invoice_template_pro_only_trigger (migration 010) already fires
-- BEFORE INSERT OR UPDATE ON invoices and will clamp a non-Pro user's
-- template to 'modern' on ANY update statement, including one issued from
-- inside this function -- duplicating the check here would just be dead
-- code.
--
-- Product decision -- rejecting an empty p_items array on update:
-- The CURRENT `.update(invoice)` implementation being replaced silently
-- skips the re-insert step entirely when items.length === 0 (`if
-- (rows.length > 0) ...`), meaning an update with zero items currently
-- "succeeds" and leaves the invoice with no line items -- itself a symptom
-- of the same missing-invariant class of bug this migration closes, not a
-- deliberate product feature. Neither actual caller can reach this path
-- today: InvoiceFormPage.jsx's save blocks submission client-side when
-- normalizedItems.length === 0 ("Add at least one invoice item..."), and
-- InvoiceDetailPage.jsx's changeTemplate always maps over the
-- already-loaded invoice's own existing invoice_items, which cannot
-- legitimately be empty for a valid invoice. create_invoice_with_items
-- already enforces "at least one item" at the database level for
-- creation; this function enforces the identical invariant for update,
-- which does not change any behavior either caller can currently reach,
-- and forecloses the exact zero-item corrupted state this migration
-- exists to prevent. Flagged here explicitly per the review that approved
-- this migration, rather than silently decided.
--
-- No SECURITY DEFINER: matches create_invoice_with_items exactly. This
-- function runs as the invoking user, so every statement inside it
-- (UPDATE invoices, DELETE/INSERT invoice_items) is still subject to the
-- existing RLS policies ("Invoices are updateable by owner", "Invoice
-- items are {insertable,deletable} by invoice owner") -- ownership is
-- enforced by Postgres itself, not re-implemented here.
--
-- Idempotent (create or replace function), safe to run on existing
-- production database. See the companion
-- 015_update_invoice_with_items_rollback.sql for the down path.
--
-- NOT YET APPLIED to production as of this commit.
-- ============================================================

begin;

create or replace function public.update_invoice_with_items(p_invoice_id uuid, p_invoice jsonb, p_items jsonb) returns uuid
    language plpgsql
    set search_path to 'public'
    as $$
declare
  v_user_id uuid := auth.uid();
  v_updated_invoices integer;
  v_inserted_items integer;
begin

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;


  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one invoice item is required.';
  end if;


  update public.invoices
  set
    client_id = (p_invoice ->> 'client_id')::uuid,
    invoice_number = nullif(p_invoice ->> 'invoice_number',''),
    invoice_date = (p_invoice ->> 'invoice_date')::date,
    due_date = (p_invoice ->> 'due_date')::date,
    currency = coalesce(nullif(p_invoice ->> 'currency',''),'USD'),
    subtotal = coalesce(nullif(p_invoice ->> 'subtotal','')::numeric,0),
    tax_total = coalesce(nullif(p_invoice ->> 'tax_total','')::numeric,0),
    discount_total = coalesce(nullif(p_invoice ->> 'discount_total','')::numeric,0),
    total = coalesce(nullif(p_invoice ->> 'total','')::numeric,0),
    status = coalesce(nullif(p_invoice ->> 'status',''),'draft'),
    notes = nullif(p_invoice ->> 'notes',''),
    template = coalesce(nullif(p_invoice ->> 'template',''),'modern')
  where id = p_invoice_id;


  get diagnostics v_updated_invoices = row_count;


  if v_updated_invoices = 0 then
    raise exception 'Invoice not found.';
  end if;


  delete from public.invoice_items
  where invoice_id = p_invoice_id;


  insert into public.invoice_items (
    invoice_id,
    description,
    quantity,
    price,
    tax_rate,
    position
  )
  select
    p_invoice_id,
    item.description,
    item.quantity,
    item.price,
    coalesce(item.tax_rate,0),
    coalesce(item.position,row_number() over ())
  from jsonb_to_recordset(p_items) as item(
    description text,
    quantity numeric,
    price numeric,
    tax_rate numeric,
    position integer
  );


  get diagnostics v_inserted_items = row_count;


  if v_inserted_items <> jsonb_array_length(p_items) then
    raise exception 'Every invoice item must be valid.';
  end if;


  return p_invoice_id;

end;
$$;

commit;
