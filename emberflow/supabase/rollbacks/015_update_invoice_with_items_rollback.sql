-- ============================================================
-- Rollback: 015_update_invoice_with_items
--
-- Drops update_invoice_with_items(uuid, jsonb, jsonb), returning
-- production to its pre-015 state. Only run this to revert 015 -- doing
-- so restores the non-atomic update -> delete -> reinsert sequence in
-- frontend/src/services/api.js's updateInvoice() (MF-3's original bug);
-- the frontend change must be reverted alongside this, or every invoice
-- edit will fail outright once this function no longer exists.
-- ============================================================

begin;

drop function if exists public.update_invoice_with_items(uuid, jsonb, jsonb);

commit;
