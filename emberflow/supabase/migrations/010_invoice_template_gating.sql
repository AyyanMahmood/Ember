-- ============================================================
-- Migration: Fix invoice template persistence on create + add a
-- server-side Pro backstop for premium templates (final launch
-- hardening security/correctness audit, 2026-08-01)
--
-- Bug 1 (correctness, affects every user): create_invoice_with_items()'s
-- insert column list never included `template`, so whatever template a
-- user picked when creating a new invoice was silently discarded in favor
-- of the invoices.template column's default ('modern'). Only a later edit
-- (updateInvoice(), a plain .update()) actually persisted it. Fixed by
-- adding template to the insert.
--
-- Bug 2 (security, Free-tier billing bypass): premium invoice templates
-- were only ever gated in the UI (TemplatesPage, TemplateSelector, and a
-- newly-added guard for the ?template= URL-param entry point in
-- InvoiceFormPage.jsx) -- there was no database-level backstop, unlike
-- every other Pro-gated write in this schema (proposals has
-- enforce_proposals_pro_only, branding has enforce_branding_pro_only).
-- A Free user could set invoices.template to any premium id via a direct
-- RPC/API call, bypassing the frontend entirely. Fixed with a trigger that
-- mirrors the existing pattern.
--
-- The trigger only intervenes when `template` is actually CHANGING to a
-- non-free value while the account is on the free plan -- it deliberately
-- does NOT strip a premium template a user already legitimately saved
-- while Pro (matches Brand Studio's established "clamp new writes, never
-- destroy existing values on downgrade" behavior; see
-- enforce_branding_pro_only / 006_brand_studio_free_tier.sql). It silently
-- falls back to 'modern' rather than raising, unlike the proposals/brand
-- triggers -- this field is cosmetic, not identity-bearing, and a hard
-- exception here would risk failing an unrelated save (e.g. editing notes)
-- if any client-side timing edge case ever resent a stale premium id.
--
-- Free template ids are the current, deliberately small (3 of 17) set
-- (frontend/src/document-studio/themes.js). Safe to run on existing
-- production database; both changes are additive/backwards compatible.
-- ============================================================

begin;

create or replace function public.create_invoice_with_items(p_invoice jsonb, p_items jsonb) returns uuid
    language plpgsql
    set search_path to 'public'
    as $$
declare
  v_invoice_id uuid;
  v_user_id uuid := auth.uid();
  v_inserted_items integer;
  v_plan text;
  v_usage_month date := date_trunc('month', now())::date;
  v_invoice_count integer;
  v_free_template_ids text[] := array['modern', 'minimal', 'ledger'];
  v_template text;
begin

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;


  select plan
  into v_plan
  from public.subscriptions
  where user_id = v_user_id
  limit 1;


  if coalesce(v_plan, 'free') = 'free' then

    insert into public.invoice_usage (
      user_id,
      usage_month,
      invoice_count
    )
    values (
      v_user_id,
      v_usage_month,
      0
    )
    on conflict (user_id, usage_month)
    do nothing;


    select invoice_count
    into v_invoice_count
    from public.invoice_usage
    where user_id = v_user_id
    and usage_month = v_usage_month
    for update;


    if v_invoice_count >= 5 then
      raise exception 'Free plan invoice limit reached.';
    end if;


    update public.invoice_usage
    set invoice_count = invoice_count + 1,
        updated_at = now()
    where user_id = v_user_id
    and usage_month = v_usage_month;

  end if;


  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one invoice item is required.';
  end if;


  v_template := coalesce(nullif(p_invoice ->> 'template', ''), 'modern');
  if coalesce(v_plan, 'free') = 'free' and not (v_template = any(v_free_template_ids)) then
    v_template := 'modern';
  end if;


  insert into public.invoices (
    user_id,
    client_id,
    invoice_number,
    invoice_date,
    due_date,
    currency,
    subtotal,
    tax_total,
    discount_total,
    total,
    status,
    notes,
    template
  )
  values (
    v_user_id,
    (p_invoice ->> 'client_id')::uuid,
    nullif(p_invoice ->> 'invoice_number',''),
    (p_invoice ->> 'invoice_date')::date,
    (p_invoice ->> 'due_date')::date,
    coalesce(nullif(p_invoice ->> 'currency',''),'USD'),
    coalesce(nullif(p_invoice ->> 'subtotal','')::numeric,0),
    coalesce(nullif(p_invoice ->> 'tax_total','')::numeric,0),
    coalesce(nullif(p_invoice ->> 'discount_total','')::numeric,0),
    coalesce(nullif(p_invoice ->> 'total','')::numeric,0),
    coalesce(nullif(p_invoice ->> 'status',''),'draft'),
    nullif(p_invoice ->> 'notes',''),
    v_template
  )
  returning id into v_invoice_id;


  insert into public.invoice_items (
    invoice_id,
    description,
    quantity,
    price,
    tax_rate,
    position
  )
  select
    v_invoice_id,
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


  return v_invoice_id;

end;
$$;

create or replace function public.enforce_invoice_template_pro_only() returns trigger
    language plpgsql security definer
    set search_path to 'public'
    as $$
declare
  v_plan text;
  v_free_template_ids text[] := array['modern', 'minimal', 'ledger'];
begin

  if new.template is not null
     and not (new.template = any(v_free_template_ids))
     and (tg_op = 'INSERT' or new.template is distinct from old.template)
  then

    select plan
    into v_plan
    from public.subscriptions
    where user_id = new.user_id
    limit 1;

    if coalesce(v_plan, 'free') = 'free' then
      new.template := 'modern';
    end if;

  end if;

  return new;

end;
$$;

drop trigger if exists enforce_invoice_template_pro_only_trigger on public.invoices;

create trigger enforce_invoice_template_pro_only_trigger
  before insert or update on public.invoices
  for each row execute function public.enforce_invoice_template_pro_only();

commit;
