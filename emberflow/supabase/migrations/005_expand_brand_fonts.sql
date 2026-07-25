-- ============================================================
-- Migration: Expand the Brand Studio curated font list
--
-- Adds geist, ibm-plex-sans, and plus-jakarta-sans to the allowed
-- profiles.brand_font values (003_brand_studio.sql's CHECK constraint).
-- Satoshi, also requested, is deliberately excluded -- it isn't available
-- as an npm/@fontsource package like every other font here, only via
-- Fontshare's own hosting; see document-studio/fonts.js for the full note.
--
-- Additive, backward-compatible: existing rows are unaffected (none of
-- them can already hold a value outside the old list).
--
-- Safe to run on existing production database.
-- ============================================================

begin;

alter table public.profiles
  drop constraint profiles_brand_font_check;

alter table public.profiles
  add constraint profiles_brand_font_check
  check (brand_font in ('inter', 'manrope', 'space-grotesk', 'geist', 'ibm-plex-sans', 'plus-jakarta-sans', 'fraunces'));

commit;
