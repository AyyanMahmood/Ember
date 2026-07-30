# Repository Cleanup List (Phase 3)

**Nothing here has been deleted.** This is a categorized list for a human to action with judgment. Grouped by confidence. Verified by reading each file's header and checking references — not guessed.

Rule applied: **code and API surface were already confirmed clean** in Phase 2 (no Paddle/Microsoft/debug remnants in `api/` or `frontend/src`, no dead CSS, no unused exports). This list is almost entirely **root markdown hygiene** — historical planning docs that have served their purpose.

---

## A. Safe to delete now — empty stub files (0 bytes of content)

These are tracked but **completely empty** (0 lines). They add noise and imply content that doesn't exist.

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

## Suggested cleanup commit sequence (for the owner to run — not done automatically)

1. `git rm` the three clearly-empty stubs (`ARCHITECTURE.md`, `DESIGN.md`, `UI_ROADMAP.md`); decide `AGENTS.md`.
2. `mkdir docs/archive && git mv` the six B-tier historical docs into it.
3. Manually verify + `rm -rf ../frontend` (the out-of-repo stale copy) after confirming it's the known leftover.
4. Leave everything in C and D untouched.

**Do not** touch `paddle_*` DB columns or `testing-issues.md`.
