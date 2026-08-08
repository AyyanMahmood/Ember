-- ============================================================
-- Rollback: 014_restore_logos_delete_policy
--
-- Removes the "Users can delete own logos" policy on storage.objects,
-- returning production to its pre-014 state (no DELETE policy for the
-- logos bucket). Only run this to revert 014 -- doing so restores the
-- silent deleteLogoAsset() cleanup failure described in 014's own
-- header; it does not fix anything and is not otherwise recommended.
-- ============================================================

begin;

drop policy if exists "Users can delete own logos" on storage.objects;

commit;
