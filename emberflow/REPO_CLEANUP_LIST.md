# Repository Cleanup List (Phase 3)

> ## 🧊 LAUNCH FREEZE — 2026-07-30
> **EmberFlow is in release freeze. NOTHING in this list executes until AFTER launch.**
> No files deleted, moved, archived, or refactored. Every item below is classified into one of four post-launch buckets; the classification is the *only* thing produced under freeze. The sole permitted code changes before launch are: **production configuration, real payment testing, critical bug fixes, security fixes.** Everything here is, by definition, none of those.

**Nothing here has been deleted or moved.** This is a categorized list for a human to action *after launch*, with judgment. Verified by reading each file's header and checking references — not guessed.

Rule applied: **code and API surface were already confirmed clean** in Phase 2 (no Paddle/Microsoft/debug remnants in `api/` or `frontend/src`, no dead CSS, no unused exports). This list is almost entirely **root markdown hygiene** — historical planning docs that have served their purpose.

---

## Final classification (freeze) — every item in exactly one bucket

Four buckets, all **post-launch**. "Keep permanently" = never remove. Nothing is actioned now.

| Item | Bucket | Why |
|---|---|---|
| `ARCHITECTURE.md` (empty) | **Delete after launch** | 0-byte stub; content lives in SPECIFICATION.md/CLAUDE.md |
| `DESIGN.md` (empty) | **Delete after launch** | 0-byte stub; superseded by DESIGN_SYSTEM.md/EMBER_DESIGN_BIBLE.md |
| `UI_ROADMAP.md` (empty) | **Delete after launch** | 0-byte stub; superseded by V1.5_ROADMAP.md |
| `AGENTS.md` (empty) | **Delete after launch** (or fill) | 0-byte; may be an AI-tool convention file — owner decides delete vs. fill with a CLAUDE.md pointer |
| `MIGRATION_PLAN.md` | **Archive after launch** | Executed UI-migration plan; historical |
| `IMPLEMENTATION_SPEC.md` | **Archive after launch** | Executed impl spec; historical |
| `API_VERIFICATION.md` | **Archive after launch** | Dated point-in-time verification snapshot |
| `MIGRATION_AUDIT.md` | **Archive after launch** | Dated point-in-time schema audit |
| `MIGRATION_NOTES.md` | **Archive after launch** | Near-empty running log the pattern didn't stick |
| `POLAR_MIGRATION_PLAN.md` | **Archive after launch** | Completed & merged migration; historical rationale |
| Stray out-of-repo `../frontend/` | **Delete after launch** (manual) | Stale mini-copy outside the project dir; verify then `rm -rf` |
| `subscriptions.paddle_*` DB columns | **Delete after launch** (gated) | Only after a real production Polar purchase succeeds — see POLAR_SETUP.md → Decommissioning Paddle |
| `CLAUDE.md`, `README.md`, `SPECIFICATION.md`, `SECURITY.md` | **Keep permanently** | Current project/tech/security reference |
| `POLAR_SETUP.md`, `OAUTH_SETUP.md` | **Keep permanently** | Current setup guides |
| `DESIGN_SYSTEM.md`, `EMBER_DESIGN_BIBLE.md` | **Keep permanently** | Canonical design authority |
| `EMBER_UI_GUIDE.md`, `EMBER_UI_TIERING.md` | **Keep permanently** | Active Ember UI workflow + plan |
| `PROJECT_STATUS.md`, `MANUAL_QA_CHECKLIST.md` | **Keep permanently** | Active roadmap tracker + frontend QA |
| Launch doc set (`BILLING_QA_CHECKLIST`, `PRODUCTION_VALIDATION_PLAN`, `PRODUCTION_CHECKLIST`, `LAUNCH_*`, `SUPPORT_PLAYBOOK`, `V1.5_ROADMAP`, this file) | **Keep permanently** | The launch/ops documentation |
| `references/` (local clones) | **Keep permanently** (local, gitignored) | Study material; never committed; not a repo concern |
| `testing-issues.md` | **Keep permanently** (local, gitignored) | Local scratch; leave as-is |

**Bucket totals:** Delete after launch = 5 (4 empty stubs + stray folder) · Archive after launch = 6 · Delete after launch (gated) = 1 (paddle columns) · Keep permanently = everything else.

---

## A. Delete AFTER LAUNCH — empty stub files (0 bytes of content)

These are tracked but **completely empty** (0 lines). They add noise and imply content that doesn't exist. Under freeze they stay; delete post-launch.

| File | Note |
|---|---|
| `ARCHITECTURE.md` | Empty. Real architecture content lives in `SPECIFICATION.md` / `CLAUDE.md`. |
| `DESIGN.md` | Empty. Superseded by `DESIGN_SYSTEM.md` + `EMBER_DESIGN_BIBLE.md`. |
| `UI_ROADMAP.md` | Empty. Superseded by the new `V1.5_ROADMAP.md`. |
| `AGENTS.md` | Empty — **but** `AGENTS.md` is a convention some AI coding tools read (like a cross-tool CLAUDE.md). Deleting is safe; alternatively *fill* it with a one-line pointer to CLAUDE.md. Owner's call. |

**Recommendation:** delete the first three; decide `AGENTS.md` (delete or fill). All safe — none are imported or referenced by build/runtime.

---

## B. Archive candidates — historical, superseded, but have real content

These are point-in-time planning/verification docs from the **UI design-system rebuild** (mid-July) or the **Paddle→Polar migration**, all now executed. They're accurate historical records, not active docs. Recommend moving to a `docs/archive/` folder (or deleting if git history is considered sufficient) — **owner decision, not auto-delete**, because they may hold context a future contributor wants.

| File | What it is | Why it's a candidate |
|---|---|---|
| `MIGRATION_PLAN.md` (609L) | The UI legacy→canonical **design migration** plan, "not yet started" as of 2026-07-18 | UI migration is marked **Complete** in CLAUDE.md's status table; this is a pre-execution plan, now historical |
| `IMPLEMENTATION_SPEC.md` (1084L) | Implementation spec companion to `MIGRATION_PLAN.md`, same era | Same — the work it specified is done |
| `API_VERIFICATION.md` (425L) | Point-in-time verification of `components/ui/` vs the impl spec (2026-07-18) | A dated snapshot; components have since evolved (SegmentedControl/ProgressRing/etc. added) |
| `MIGRATION_AUDIT.md` (84L) | Point-in-time prod-vs-migrations schema audit (2026-07-25) | Snapshot; superseded by the current DB state + `PRODUCTION_CHECKLIST.md`'s live-verify step |
| `MIGRATION_NOTES.md` (11L) | Near-empty "append findings after each PR" log | Barely used; the pattern didn't stick. Delete or fold into CLAUDE.md's changelog convention |
| `POLAR_MIGRATION_PLAN.md` (197L) | The Paddle→Polar migration plan | Migration is **complete and merged**; historical. Keep only if you want the migration rationale preserved outside git history |

**Recommendation:** create `docs/archive/`, move A/B historical docs there in one commit so the root shows only *live* docs. This is the single highest-value cleanup — the root has 27 markdown files and it's hard to tell live from historical.

---

## C. Keep — active and current

| File | Why keep |
|---|---|
| `CLAUDE.md` | The running project record (loaded each session) |
| `README.md`, `SPECIFICATION.md` | Current product/tech reference (updated for Polar) |
| `SECURITY.md` | Current security posture |
| `POLAR_SETUP.md` | Current billing setup guide |
| `OAUTH_SETUP.md` | Current (Google OAuth) |
| `DESIGN_SYSTEM.md`, `EMBER_DESIGN_BIBLE.md` | The canonical design authority (large, current) — *possible* consolidation into one, but both are substantive; not this pass |
| `EMBER_UI_GUIDE.md`, `EMBER_UI_TIERING.md` | Active Ember UI workflow + plan |
| `PROJECT_STATUS.md` | Referenced by CLAUDE.md as the roadmap-phase tracker |
| `MANUAL_QA_CHECKLIST.md` | Active frontend QA (still to be run on-device) |
| `BILLING_QA_CHECKLIST.md`, `PRODUCTION_VALIDATION_PLAN.md`, `PRODUCTION_CHECKLIST.md`, `LAUNCH_*.md`, `SUPPORT_PLAYBOOK.md`, `V1.5_ROADMAP.md` | The launch doc set (this + last phase) |

---

## D. Non-file items (already handled or noted)

| Item | Status |
|---|---|
| `references/` (3.3GB local clones) | ✅ Now gitignored (`e935578`) |
| Stray `../frontend/` (out-of-repo leftover) | Documented; sits outside the project dir, can't be gitignored from here. Safe to `rm -rf` it manually if confirmed it's the known empty leftover (it had only `.env.local`, `dist`, `node_modules`, `package-lock.json` — a stale mini-copy). **Owner should verify then delete manually.** |
| `testing-issues.md` | Already gitignored (local scratch) — leave as-is |
| `supabase/schema.sql` `paddle_*` columns | Intentionally retained (rollback safety) — drop only post-launch per `POLAR_SETUP.md` → Decommissioning Paddle |

---

## Suggested cleanup commit sequence — 🧊 FROZEN, run only AFTER launch

**Do not run any of this during launch freeze.** Sequence for the owner post-launch:

1. `git rm` the three clearly-empty stubs (`ARCHITECTURE.md`, `DESIGN.md`, `UI_ROADMAP.md`); decide `AGENTS.md` (delete or fill).
2. `mkdir docs/archive && git mv` the six historical "Archive after launch" docs into it.
3. Manually verify + `rm -rf ../frontend` (the out-of-repo stale copy) after confirming it's the known leftover.
4. Leave everything classified "Keep permanently" untouched.

**Do not** touch `paddle_*` DB columns (gated on live Polar verification) or `testing-issues.md` (local scratch).
