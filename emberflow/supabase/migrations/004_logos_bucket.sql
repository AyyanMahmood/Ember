-- ============================================================
-- Migration: Create the missing `logos` storage bucket
--
-- SECURITY.md (Phase 2 audit) found that `storage.buckets` only ever had
-- an `avatars` row -- `logos` never existed, even though storage.objects
-- RLS policies scoped to bucket_id = 'logos' were already in place
-- (policies.sql, 003_brand_studio.sql). Every logo upload -- the
-- pre-Brand-Studio SettingsPage code and the new Brand Studio code alike --
-- has been failing with "Bucket not found" in production as a result.
--
-- Mirrors the `avatars` bucket's config (public read, bucket-level size/
-- mime-type limits as defense-in-depth alongside the client-side checks
-- in brandAssets.js), sized for a business logo rather than a photo.
--
-- Additive, idempotent (ON CONFLICT DO NOTHING), safe to run on existing
-- production database.
-- ============================================================

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  2097152, -- 2MB, matches brandAssets.js's MAX_LOGO_BYTES
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

commit;
