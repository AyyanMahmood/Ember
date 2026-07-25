-- ============================================================
-- Migration: Generous free tier for Brand Studio
--
-- Product decision: Free users get a real (if limited) Brand Studio --
-- they can set their one brand color (and the document footer text,
-- which was never actually gated by this trigger to begin with) without
-- Pro. Logo upload, custom font, and the accent-color override remain
-- Pro-only. Updates enforce_branding_pro_only() (003_brand_studio.sql)
-- to drop invoice_brand_color from the set of columns that require an
-- active Pro plan to change.
--
-- CREATE OR REPLACE, not drop+recreate: same name/signature, so the
-- existing enforce_branding_pro_only_trigger doesn't need to be touched.
--
-- Safe to run on existing production database.
-- ============================================================

begin;

create or replace function public.enforce_branding_pro_only() returns trigger
    language plpgsql security definer
    set search_path to 'public'
    as $$
declare
  v_plan text;
  v_branding_changed boolean;
begin

  v_branding_changed := (
    new.logo_url is distinct from old.logo_url
    or new.brand_font is distinct from old.brand_font
    or new.brand_accent_color is distinct from old.brand_accent_color
  );

  if v_branding_changed then

    select plan
    into v_plan
    from public.subscriptions
    where user_id = new.id
    limit 1;

    if coalesce(v_plan, 'free') = 'free' then
      raise exception 'Pro subscription required for brand customization.';
    end if;

  end if;

  return new;

end;
$$;

commit;
