-- ============================================================
-- Migration: Restore missing "Users can delete own logos" RLS policy
-- on storage.objects
--
-- Root cause: this policy is defined in supabase/policies.sql and was
-- never modified by any migration (003_brand_studio.sql explicitly
-- left it untouched -- see its comment at lines 126-129), but a
-- complete production pg_policies read confirmed it does not
-- currently exist -- production has exactly 6 storage.objects
-- policies, not the 8 policies.sql documents. No migration ever
-- dropped it; how/when it went missing is unknown.
--
-- Impact: frontend/src/services/brandAssets.js's deleteLogoAsset()
-- calls storage.from('logos').remove([path]) with the regular
-- authenticated client (not service-role), on every logo replace/
-- remove in Brand Studio (BrandStudioPage.jsx). Without this policy
-- every such call is silently denied by RLS -- the call's error is
-- deliberately never checked (documented as "best-effort cleanup" in
-- brandAssets.js), so nothing breaks visibly, but old logo objects
-- have never actually been deleted from storage on replace/remove
-- since this policy went missing. No security impact -- this only
-- ever narrows access, never widens it -- purely a silently-broken
-- cleanup path.
--
-- Definition recovered verbatim from supabase/policies.sql (the one
-- place it's still correctly documented), not a new access rule.
--
-- Deliberately does NOT restore a "Logos are readable" SELECT policy.
-- The logos bucket is public (004_logos_bucket.sql) and every read in
-- the app goes through getPublicUrl(), which bypasses storage.objects
-- RLS entirely -- confirmed no code path (frontend or api/) calls
-- .list()/.download() on the logos bucket with an RLS-subject client.
--
-- Idempotent (drop policy if exists), safe to run on existing
-- production database.
-- ============================================================

begin;

drop policy if exists "Users can delete own logos" on storage.objects;

create policy "Users can delete own logos" on storage.objects for delete
using (
  bucket_id = 'logos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

commit;
