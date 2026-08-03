-- ============================================================
-- Migration: Remove image/svg+xml from the `logos` bucket's allowed
-- mime types (final launch hardening security audit, 2026-08-01)
--
-- Root cause: 004_logos_bucket.sql allowed SVG for logo uploads, unlike
-- the `avatars` bucket which has always deliberately excluded it. The
-- `logos` bucket is public with no ownership check on read
-- (policies.sql: `using (bucket_id = 'logos')`), so an uploaded SVG
-- containing a <script>/onload= payload is reachable at a public,
-- unauthenticated URL and is served with Content-Type: image/svg+xml
-- (set from the uploaded file's own type in brandAssets.js) -- browsers
-- execute script in an SVG opened via top-level navigation (not via the
-- app's own <img> rendering, which is safe). Any authenticated user could
-- therefore host attacker-controlled JavaScript under the project's own
-- Supabase Storage subdomain by uploading it as their "logo."
--
-- Fix: tighten the bucket's own allowed_mime_types the same way the
-- client-side validation in brandAssets.js and the file input's `accept`
-- in BrandStudioPage.jsx were tightened in the same session -- defense in
-- depth, matching the avatars bucket's existing (already SVG-free) policy.
--
-- Does not touch any already-uploaded SVG object -- this only blocks new
-- uploads. Safe to run on existing production database; reversible by
-- re-adding 'image/svg+xml' to the array.
-- ============================================================

begin;

update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'logos';

commit;
