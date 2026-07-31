-- ============================================================
-- Migration: Fix false "Pro subscription required" error on free-tier saves
--
-- Root cause: enforce_branding_pro_only() (006_brand_studio_free_tier.sql)
-- detects a "branding change" via
--   new.brand_accent_color IS DISTINCT FROM old.brand_accent_color
-- profiles.brand_accent_color has no default and starts NULL for every
-- user. BrandStudioPage.jsx's handleSave always sends '' (empty string,
-- never null) for brand_accent_color when the "custom accent" checkbox is
-- off -- the default state for every Free user, and most Pro users who've
-- never touched it. '' IS DISTINCT FROM NULL evaluates true in Postgres,
-- so the very first time ANY Free user saves just their brand color (a
-- feature 006 explicitly made free), the trigger misreads that as a
-- Pro-gated branding change and raises "Pro subscription required for
-- brand customization" -- rolling back the entire UPDATE, including the
-- free-tier color/footer change that should have succeeded.
--
-- Fix: normalize '' and NULL as the same "no accent override" value on
-- both sides of the comparison, matching how the rest of the app (profile
-- load, accentEnabled state, ColorPicker fallback) already treats them.
-- CREATE OR REPLACE, same name/signature -- the existing trigger doesn't
-- need to be touched.
--
-- Safe to run on existing production database. No data changes, no schema
-- changes -- a single function body replace, fully reversible by
-- re-deploying 006's function body.
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
    or nullif(new.brand_accent_color, '') is distinct from nullif(old.brand_accent_color, '')
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
