-- ============================================================
-- Migration: Brand Studio (Pro-only logo / color / font branding)
--
-- Frontend gating (FeatureGate) only hides the UI -- it does not stop a
-- free user from calling supabase.from('profiles').upsert({...}) directly
-- (browser console, curl, etc.) with a new logo_url / invoice_brand_color /
-- brand_font / brand_accent_color. profiles' existing RLS only checks
-- auth.uid() = id, with no plan check at all, so that write would succeed
-- today. This adds a BEFORE UPDATE trigger on profiles that mirrors
-- enforce_proposals_pro_only() (see schema.sql) -- a profile row already
-- exists (created by handle_new_user / api.js getProfile()'s bootstrap
-- insert) before any branding field is ever touched, so branding changes
-- always happen via UPDATE, never INSERT, which is why this is a BEFORE
-- UPDATE trigger rather than BEFORE INSERT like the proposals one.
--
-- Also tightens the 'logos' storage bucket policies (storage.objects) with
-- the same plan check, using the subscriptions-join idiom already used by
-- the proposal_items policies in policies.sql -- defense in depth so a free
-- user can't even land a new object in the bucket by hitting the storage
-- API directly, independent of whatever the profiles trigger below does.
--
-- Additive, backward-compatible: existing rows get 'inter' / NULL
-- defaults, nothing else changes.
--
-- Safe to run on existing production database.
-- ============================================================

begin;

alter table public.profiles
  add column if not exists brand_font text not null default 'inter';

alter table public.profiles
  add constraint profiles_brand_font_check
  check (brand_font in ('inter', 'manrope', 'space-grotesk', 'fraunces'));

alter table public.profiles
  add column if not exists brand_accent_color text;

alter table public.profiles
  add constraint profiles_brand_accent_color_check
  check (brand_accent_color is null or brand_accent_color ~* '^#([0-9a-f]{3}|[0-9a-f]{6})$');

create function public.enforce_branding_pro_only() returns trigger
    language plpgsql security definer
    set search_path to 'public'
    as $$
declare
  v_plan text;
  v_branding_changed boolean;
begin

  v_branding_changed := (
    new.logo_url is distinct from old.logo_url
    or new.invoice_brand_color is distinct from old.invoice_brand_color
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

alter function public.enforce_branding_pro_only() owner to postgres;

revoke all on function public.enforce_branding_pro_only() from public;
grant all on function public.enforce_branding_pro_only() to anon;
grant all on function public.enforce_branding_pro_only() to authenticated;
grant all on function public.enforce_branding_pro_only() to service_role;

create trigger enforce_branding_pro_only_trigger
  before update on public.profiles
  for each row execute function public.enforce_branding_pro_only();

drop policy if exists "Users can upload own logos" on storage.objects;
create policy "Users can upload own logos" on storage.objects for insert
with check (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
  and exists (
    select 1 from public.subscriptions
    where subscriptions.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
  )
);

drop policy if exists "Users can update own logos" on storage.objects;
create policy "Users can update own logos" on storage.objects for update
using (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
  and exists (
    select 1 from public.subscriptions
    where subscriptions.user_id = auth.uid()
      and subscriptions.plan in ('pro_monthly', 'pro_yearly')
  )
);

-- Deleting/removing your own logo is not a "branding customization" -- a
-- user who downgrades from Pro to Free should still be able to clean up
-- their own leftover object. Left unrestricted, matching the pre-existing
-- "Users can delete own logos" policy.

commit;
