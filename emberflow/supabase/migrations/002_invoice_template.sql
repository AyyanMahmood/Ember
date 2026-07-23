-- ============================================================
-- Migration: Add template column to invoices
--
-- Phase 6 (Premium Document Studio) adds a native template selector
-- for invoices, mirroring the one proposals already have. The
-- proposals table already has a free-text `template` column with no
-- CHECK constraint (see schema.sql); invoices has none. Without this
-- column, an invoice's chosen template can't survive a page reload.
--
-- Additive, backward-compatible: existing rows get the 'modern'
-- default, nothing else changes.
--
-- Safe to run on existing production database.
-- ============================================================

begin;

alter table public.invoices
  add column if not exists template text not null default 'modern';

commit;
