# Migration Audit — Production vs. `supabase/migrations/`

**Date:** 2026-07-25
**Scope:** Phase 1 of the production-hardening pass. Report only — nothing in this document was applied to production as part of writing it (migration `003_brand_studio.sql` was applied earlier in a separate, explicitly-approved step; see CLAUDE.md "Bundle 2").
**Method:** Live production schema (`rzwgbrwjrzapbagbksof`) introspected directly via `supabase db query --linked` (`information_schema`, `pg_policies`, `pg_trigger`, `pg_class`, `pg_proc`) and compared against the three files in `supabase/migrations/` and the `schema.sql`/`policies.sql` dumps.

---

## Summary

| Migration | Claims | Actual production state | Verdict |
|---|---|---|---|
| `001_production_fixes.sql` | Add payments/subscriptions columns, `webhook_events` table, payments RLS, tighten proposals/proposal_items RLS | **All columns and the table exist. Policies exist but are duplicated** (see below) | **Substantively applied, imperfectly** |
| `002_invoice_template.sql` | Add `invoices.template` | **Column does not exist in production** | **Not applied — genuinely missing** |
| `003_brand_studio.sql` | Brand Studio columns/trigger/storage policy | Applied this session, verified | Applied cleanly |

**The CLI's own bookkeeping table doesn't exist:** `select * from supabase_migrations.schema_migrations` returns `relation does not exist`. This project has never once been managed through `supabase db push`. Every schema change to date — the base schema, migration 001's changes, and (as of this session) migration 003 — was applied via direct SQL execution (dashboard SQL editor, or `supabase db query -f` in this session), never through the CLI's migration flow. **This is why `supabase migration list` shows all three local migrations as "pending" remotely — that column reflects the CLI's bookkeeping, not the actual database schema.** It is not evidence either way of whether a migration's SQL was actually run; each one had to be checked individually against live schema, which is what the rest of this report does.

---

## Finding 1 — Migration 001 was run, but its `DROP POLICY` statements didn't match the live policy names, leaving duplicate RLS policies on `proposal_items`

`schema.sql`'s dump of `proposal_items` policies uses names **without** "are" (`"Proposal items deletable by active pro users"`, `"...insertable by proposal owner"`, `"...updateable by active pro users"`, `"...viewable by proposal owner"`). Migration 001's `drop policy if exists` statements target names **with** "are" (`"Proposal items are deletable by owner"`, `"...are updateable by owner"`, etc. — itself trying to clean up `policies.sql`'s older naming), then creates **new** policies also named **with** "are" (`"Proposal items are deletable by active pro users"`, etc.).

Because the live database's actual policy names (without "are") never matched what migration 001 tried to drop, the `DROP` was a no-op and the `CREATE` added a second, parallel set. **Confirmed live: `proposal_items` currently has 8 policies for 4 operations — two per operation, one "are"-named and one not**, both enforcing the *same* ownership + Pro-plan condition (verified by comparing `pg_policies.qual` for both — byte-identical logic, just two copies).

```
SELECT: "Proposal items are viewable by proposal owner"   AND   "Proposal items viewable by proposal owner"
INSERT: "Proposal items are insertable by proposal owner" AND   "Proposal items insertable by proposal owner"
UPDATE: "Proposal items are updateable by active pro users" AND "Proposal items updateable by active pro users"
DELETE: "Proposal items are deletable by active pro users"  AND "Proposal items deletable by active pro users"
```

**Risk:** Not a security hole today (Postgres RLS policies are OR'd together and both copies enforce identical logic, so behavior is correct). But it's a real maintenance hazard: any future change to `proposal_items` access rules that only updates one naming variant will silently leave the other stale-but-still-permissive policy in effect, which **could** reopen a hole that looks closed in the migration file. `proposals` itself (the parent table) did **not** get this duplicate treatment — `schema.sql` already used "are"-style names for `proposals`, so 001's drop/create there matched cleanly.

**Also found while checking this:** migration 001's `webhook_events` section grants `INSERT/SELECT/UPDATE/DELETE/...` to `anon` and `authenticated` in addition to `service_role` (matching `schema.sql`'s dump, which has the same three-role grant). **Live production only grants `service_role` (and `postgres`) — `anon`/`authenticated` have no table-level grant on `webhook_events` at all.** This is *more* restrictive than what either the migration file or `schema.sql` describe, and is fine from a security standpoint (RLS is enabled with zero policies anyway, so `anon`/`authenticated` are fully denied either way — the missing grant is a redundant second lock, not a gap). It's mentioned here only because it's more evidence that **production was hand-assembled via direct SQL over time, not produced by literally running any one of these files start to finish.**

## Finding 2 — Migration 002 (`invoices.template`) is genuinely missing, and this is an active, live bug

Confirmed via `information_schema.columns`: `invoices` has no `template` column in production.

Tracing how the app actually uses it (`frontend/src/services/api.js`):
- **`createInvoice`** goes through the `create_invoice_with_items(p_invoice, p_items)` RPC (`schema.sql:40-179`). That function explicitly extracts only `client_id, invoice_number, invoice_date, due_date, currency, subtotal, tax_total, discount_total, total, status, notes` from the `p_invoice` jsonb — it never references `template` at all. So on **new invoice creation**, a chosen template is silently dropped, no error. Harmless in the sense that nothing breaks, but the template choice never actually saves.
- **`updateInvoice`** (`api.js:196`) does a direct `supabase.from("invoices").update(invoice)`, and `InvoiceFormPage.jsx:180` builds that payload as `{ ...form, ... }` where `form.template` is always set (`buildInitialForm` defaults it to `DEFAULT_THEME_ID`, and the edit-load path sets it from the loaded invoice). **Because `invoices.template` doesn't exist, PostgREST rejects any column not in its schema cache — meaning every single "Save" on an existing invoice in production today fails outright** with an error like *"Could not find the 'template' column of 'invoices' in the schema cache."*

This is very likely the single highest-impact bug on this whole audit: **editing any existing invoice is currently broken in production**, not merely "the template doesn't persist." (`duplicateInvoice`, `api.js:218-234`, also includes `template` in its payload — but it goes through `createInvoice`/the RPC, so it's silently dropped like any other new-invoice creation, not an error.)

For contrast: `proposals.template` **does** already exist in production (confirmed) — it was part of the original base schema, which is why migration 002's own commit message says proposals never needed a migration for this. Only invoices were missing it, and that gap is exactly migration 002.

## Finding 3 — `schema.sql`/`policies.sql` are stale reference dumps, not ground truth

Confirmed across this audit and the earlier Brand Studio session: `schema.sql` reflects roughly a "post-001, pre-002" snapshot, but not an exact one (the `webhook_events` grant discrepancy above shows even that's approximate). Neither file has been regenerated since migration 002 was written. **Do not treat `schema.sql`/`policies.sql` as authoritative for "what's actually live" — this audit only trusted direct queries against the linked production database.**

---

## Detailed diff (production vs. each migration's intended end-state)

| Object | Migration 001 wants | Migration 002 wants | Live production |
|---|---|---|---|
| `payments.currency/payment_date/method/reference/notes` | add | — | **present** |
| `subscriptions.billing_cycle/paddle_*/current_period_*/cancel_at_period_end/trial_ends_at` | add | — | **present** |
| `public.webhook_events` table | create + RLS + grants (anon/authenticated/service_role) | — | **present**, RLS on, but grants are **service_role/postgres only** |
| `payments` RLS (select/insert/update/delete, owner-only) | create | — | **present**, matches |
| `proposals` UPDATE/DELETE RLS (Pro-gated) | create (replacing owner-only) | — | **present**, matches, no duplicates |
| `proposal_items` SELECT/INSERT/UPDATE/DELETE RLS | create (replacing owner-only) | — | **present, but duplicated** (8 policies, 2 per op — see Finding 1) |
| `invoices.template` | — | add `text not null default 'modern'` | **absent** — see Finding 2 |

---

## Risks (ranked)

1. **High — invoice edits are broken in production right now** (Finding 2). Every "Save" on an existing invoice fails. This predates this session and is unrelated to Brand Studio; it needs its own fix, separate from a routine migration-apply.
2. **Medium — no migration history tracking** (`supabase_migrations.schema_migrations` doesn't exist). Any future `supabase db push` will attempt to replay 001 *and* 002 from scratch against a database that already has most of 001's changes (in its imperfect form) — likely erroring on `add constraint`/duplicate-policy conflicts, or silently adding a *third* copy of the `proposal_items` policies. **Do not run a bare `db push` on this project without reconciling history first.**
3. **Low-Medium — duplicate `proposal_items` policies** (Finding 1). Not exploitable today, but a latent trap for the next person who edits access rules there and only touches one naming variant.
4. **Low — stale `schema.sql`/`policies.sql`** (Finding 3). Not a runtime risk, but a documentation-trust risk: anyone (including a future me) reasoning from those files instead of live introspection will draw wrong conclusions, exactly as almost happened in the Brand Studio session that first surfaced this.

## Recommendations (not applied — awaiting your call)

- **Fix the invoice-update bug** (Finding 2) — this is the one item here I'd treat as urgent regardless of the rest of this hardening pass, since it's actively broken for users today. Likely just needs `002_invoice_template.sql` applied; no application code changes required since `updateInvoice` already sends `template` and `create_invoice_with_items` would need a matching update to actually persist it on creation too (currently silently drops it even once the column exists).
- **Reconcile the duplicate `proposal_items` policies** (Finding 1) before ever running `supabase db push` — drop one naming variant (recommend keeping the "are"-named set, since that's what all three other Pro-gated tables use) in an explicit, reviewed migration, not a blind push.
- **Mark 001 as applied in CLI history** (`supabase migration repair --status applied 001`) once the duplicate-policy cleanup above lands, so the file and reality agree and future `db push` runs don't try to replay it.
- **Regenerate `schema.sql` from a real `pg_dump`** once the above is settled, so it's trustworthy again as a reference (this session's `db dump --linked` failed locally — missing Docker image for this Postgres version — so this needs to run somewhere with Docker available, or via the Supabase dashboard's own backup/export).

No migrations were applied and no schema was changed while producing this report.
