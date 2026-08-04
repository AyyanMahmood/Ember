# Documentation Map

One index for every markdown doc in this repository — what it's for and when to read it — so finding the right doc doesn't mean guessing among two dozen root files. Supersedes `docs/archive/REPO_CLEANUP_LIST.md`, whose planned cleanup this map reflects the result of (executed 2026-08-04).

## Start here

- **`CLAUDE.md`** — the project's operating instructions, loaded every session. Architecture rules, design system, current status table. Read this first, always.
- **`README.md`** — product overview for a human landing in the repo cold.

## Product & technical reference (current, keep permanently)

| Doc | What it's for |
|---|---|
| `SPECIFICATION.md` | Technical spec — data model, feature scope. |
| `SECURITY.md` | Current security posture. |
| `DESIGN_SYSTEM.md`, `EMBER_DESIGN_BIBLE.md` | Canonical visual design authority. |
| `EMBER_UI_GUIDE.md`, `EMBER_UI_TIERING.md` | Ember UI component-library workflow and extraction plan. |
| `POLAR_SETUP.md`, `OAUTH_SETUP.md` | Current third-party integration setup guides. |

## Release tracking (living documents — update, don't replace)

| Doc | What it's for |
|---|---|
| `CHANGELOG.md` | Itemized, version-by-version change log (Keep a Changelog format). The terse record. |
| `RELEASE_NOTES.md` | Narrative release announcement for the current release — the "what and why," written for a human, not a diff. |
| `KNOWN_ISSUES.md` | The single canonical tracker of genuine open issues, grouped by urgency. Absorbed the former `KNOWN_LIMITATIONS.md` on 2026-08-04 (see its note at the bottom of `KNOWN_ISSUES.md`). |
| `SESSION_HISTORY.md` | Dated, append-only engineering write-ups — root causes, migration decisions, per-commit rationale. Not auto-loaded; read on demand for the "why" behind a past decision. |
| `PROJECT_STATUS.md` | Roadmap-phase tracker referenced by `CLAUDE.md`. |

## Launch / QA doc set (current)

| Doc | What it's for |
|---|---|
| `LAUNCH_QA.md` | The master pre-live checklist — go-live config + full-app QA. Start here for "is this ready to launch." |
| `LAUNCH_BLOCKERS.md`, `LAUNCH_READINESS_REPORT.md`, `PRODUCTION_CHECKLIST.md`, `PRODUCTION_VALIDATION_PLAN.md` | Supporting launch-readiness docs from the hardening sprints. Meaningful overlap with `LAUNCH_QA.md` has grown since it was written (flagged during the 2026-08-04 documentation audit) — worth a consolidation pass, not urgent, not done in this pass to avoid scope creep on a docs-only cleanup. |
| `MANUAL_QA_CHECKLIST.md` | Frontend QA checklist, still to be run on-device. |
| `SUPPORT_PLAYBOOK.md` | EmberFlow's billing support playbook — the worked example behind `~/Desktop/Ember Holdings/operations/`'s company-wide support/refund framework. |

## Forward planning

| Doc | What it's for |
|---|---|
| `V1.5_ROADMAP.md` | Grounded post-launch roadmap. |
| `LANDING_REDESIGN_REFERENCES_AND_GUIDELINES.md` | Currently an empty placeholder (0 bytes, untracked) — fill when that work starts, or delete if it's stale. |

## Local-only (gitignored, not repository concerns)

- `testing-issues.md` — local scratch notes.
- `references/` — cloned reference libraries for design study.

## Historical (`docs/archive/`)

Point-in-time planning/verification docs whose work is complete — kept for the record, not live references. If you're trying to understand *current* state, you almost never need to open these; they document decisions already made and executed.

| Doc | What it captured |
|---|---|
| `MIGRATION_PLAN.md`, `IMPLEMENTATION_SPEC.md`, `API_VERIFICATION.md` | The mid-2026 UI legacy→canonical design-system migration (now complete). |
| `MIGRATION_AUDIT.md`, `MIGRATION_NOTES.md` | Point-in-time schema audit and a migration log that didn't get sustained use. |
| `POLAR_MIGRATION_PLAN.md` | The Paddle→Polar migration plan (complete, merged). |
| `BILLING_QA_CHECKLIST.md` | Billing-only QA checklist, superseded by the broader `LAUNCH_QA.md`. |
| `BILLING_UX_ARCHITECTURE.md` | Billing UX/IA design proposal, self-declared "approved & implemented" — kept as the design record. |
| `KNOWN_LIMITATIONS.md` | v1.0.0-dated limitations snapshot — merged into `KNOWN_ISSUES.md`, kept here as the frozen point-in-time version. |
| `REPO_CLEANUP_LIST.md` | The cleanup plan this map is the result of executing. |

## Ecosystem docs outside this repository

This repo is one product in a larger ecosystem. Related documentation lives outside it, deliberately (see `CLAUDE.md`'s Architecture Protection section on why production code/docs and ecosystem-wide planning stay separate):

- `~/Desktop/Ember UI/` — the canonical cross-product component/design system this repo consumes.
- `~/Desktop/White Label EmberFlow/` — the commercial white-label template product line.
- `~/Desktop/Ember Holdings/` — company-wide operations (marketing, support/release/versioning policy) that sits above any single product.

---
*Reflects repository state as of 2026-08-04. If a doc listed here has since moved or been superseded, trust the doc over this map and update this map to match.*
