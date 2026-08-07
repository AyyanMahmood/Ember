# Ember UI — Component Extraction Tiering Plan

**Planning only. No extraction performed here** (per Phase 2 rules). This ranks every reusable EmberFlow component for eventual graduation into Ember UI (`~/Desktop/Ember UI/`), and — critically — decides for each whether it should **stay custom**, **become an Ember UI primitive**, or **be replaced by an open-source primitive**. Companion: `EMBER_UI_GUIDE.md` (workflow), CLAUDE.md → Ember UI.

Usage counts are real (grepped from `frontend/src`). Reference libraries studied: shadcn/ui, Radix UI, Headless UI, Mantine, HeroUI, Chakra UI, Tremor, Magic UI, Origin UI, Animate UI, React Bits, Framer Motion — plus documentation sources (reactbits.dev, kokonutui.com, motion.dev, animejs.com, rive.app).

**Tiering definition**

- **Tier 1** — highest usage, most stable, zero app-specific logic. Extract first; everything else depends on these.
- **Tier 2** — genuinely reusable, valuable, but needs light API stabilization or has nuance to resolve before it's canonical.
- **Tier 3** — app-specific, low-reuse, or better served by adopting an OSS primitive than extracting the current custom one.

---

## Already extracted (2026-07-30, prior pass — for reference)

`SegmentedControl`, `ProgressRing`, `ProgressBar`, `ItemRow`, `useAnimatedNumber`, and the `Modal` icon-medallion feature already live in `~/Desktop/Ember UI/components/`. `polar-billing/` (backend module) too. This plan covers what remains.

---

## Tier 1 — extract first (foundation)

### `Button` — **become Ember UI** · used in 23 files

The single most-used primitive; every other extracted component (`ItemRow`, `ConfirmDialog`) already had to assume it exists (the `modal-dialog` extraction literally says "bring your own Button"). Zero business logic. Mature API (`variant`/`size`/`loading`/`leftIcon`/`fullWidth`/polymorphic `as`).

- **Reference synthesis:** Radix/Headless don't ship a styled button (headless only); shadcn's `Button` (CVA variants + `asChild`) is the API benchmark; Mantine/HeroUI show good `loading`/`leftSection` ergonomics. Ember's version already combines these well — keep its terracotta-on-dark identity, don't convert to a generic shadcn button. **Decision: extract as-is, it's the reference the others need.**

### `Card` (+ `CardHeader`/`StatCard`/`FeatureCard`/`PricingCard`) — **become Ember UI** · used in 21 files

Second-most-used; the floating-panel identity is core to the Ember look. Compositional, no logic.

- **Reference synthesis:** shadcn `Card` is the composition benchmark (`Card`/`Header`/`Title`/`Content`/`Footer`); Ember's `panel` styling (large radius, soft shadow, glass) is the differentiator to preserve. **Decision: extract the base `Card`/`CardHeader`; keep `StatCard`/`PricingCard` as Ember-flavored variants in the same module.**

---

## Tier 2 — extract after Tier 1 (stabilize first)

### `Input` / `Textarea` — **become Ember UI** · used in 11 files

Reusable, good focus-glow identity, supports `error`/`hint`/`leftAddon`/`rightAddon`. Minor nuance: the required-asterisk is duplicated as an inline style in a few places (a known Low item) — consolidate to one class **before** extracting so the canonical version is clean.

- **Reference:** shadcn/Radix `Label`+`Input` pairing, Mantine's addon/section API. **Decision: extract after the asterisk cleanup.**

### `Badge` / `StatusBadge` / `Chip` — **become Ember UI** · used in 7 files

Just improved this phase (snake_case formatting + `past_due`/`unpaid` variants). Clean variant system. `StatusBadge`'s status→variant map is _semi_ app-specific (invoice + subscription statuses), so the generic `Badge` extracts cleanly while `StatusBadge` should be extracted as a _configurable_ variant (pass the status map in) rather than hardcoding EmberFlow's statuses.

- **Reference:** Tremor's `Badge` (ring-inset semantic variants) is the benchmark. **Decision: extract `Badge` + `Chip`; generalize `StatusBadge` to accept a status map.**

### `Loading` (`LoadingSpinner`) — **become Ember UI** · used in 15 files

Trivial, mature, everywhere. The "no skeleton screens" philosophy is an Ember design principle worth encoding in the module's docs.

- **Decision: extract as-is.**

### `Modal` / `ConfirmDialog` / `Drawer` — **become Ember UI (complete the module)** · used in 9 files

The icon-medallion feature already graduated. The **remaining** mechanics (focus trap via `useFocusTrap`, scroll lock, `Drawer`) were flagged as not-yet-re-researched against Radix `FocusScope` / React Aria's focus-trap.

- **Reference synthesis:** Radix `Dialog`/`AlertDialog` and Headless UI `Dialog` are the a11y benchmarks (portal, focus scope, `aria-modal`, inert background). Ember's hand-rolled `useFocusTrap` works but should be validated against these before it's canonical. **Decision: audit `useFocusTrap` against Radix `FocusScope` first, then extract the full module. Do NOT adopt Radix Dialog wholesale — Ember's styling/animation identity is worth keeping; borrow the focus-management rigor only.**

---

## Tier 3 — app-specific, or replace with OSS

### `Table` — **stay custom (for now), reconsider vs. TanStack later** · used in 6 files

Currently a bespoke component carrying real EmberFlow behavior (mobile `--stack` card layout, pagination, filters-row, the multi-icon action row). Not a clean generic primitive today.

- **Reference:** TanStack Table (headless) is the industry standard for sort/filter/pagination logic; the current custom render is fine for now. **Decision: stay custom for launch; if Proposals gains sort/pagination parity with Invoices (a known Low gap), do it by adopting TanStack Table's headless logic under Ember-styled markup rather than extracting the current bespoke one.**

### `EmberSelect` — **stay custom, but fix the positioning gap before any extraction** · used in 5 files

Themed listbox/combobox. **Has a real correctness gap** (flagged in the earlier component audit): no collision detection / viewport-flip / portal — its panel always opens downward and can clip near a viewport edge or inside a scroll container.

- **Reference:** Radix `Select`/`Popover` and Headless UI `Listbox` solve positioning via Floating UI. **Decision: do NOT extract as-is. Either (a) rebuild its positioning on Floating UI (what Radix/Headless use) then extract, or (b) replace outright with Radix `Select` under Ember styling. This is the clearest "replace with OSS primitive" candidate in the app.**

### `Tooltip` — **adopt OSS (Radix), does not exist yet**

The app has **no tooltip primitive** — icon-only buttons rely on native `title=""` (inconsistent, no delay/positioning control).

- **Decision: adopt Radix `Tooltip` (or Headless UI) under Ember styling; build it into Ember UI as an Ember-styled wrapper rather than hand-rolling positioning/portal/delay logic. Net-new, not an extraction.**

### `Dropdown` / action menu — **adopt OSS (Radix), does not exist yet**

No real dropdown-menu primitive. The invoice/proposal row renders up to 6 separate icon-buttons instead of an overflow "⋯" menu (a UX + maintainability gap noted earlier).

- **Decision: adopt Radix `DropdownMenu` under Ember styling; use it to collapse the row-actions cluster. Net-new.**

### Chart / Analytics components — **adopt OSS (Recharts/Tremor), do not exist yet**

Analytics is currently number tiles with no visualization; no chart code exists, and `recharts` isn't installed despite being named in CLAUDE.md's preferred additions.

- **Reference:** Tremor (dashboard-specialized, dark-first) and Recharts are the benchmarks; Tremor's chart components are the closest to Ember's aesthetic. **Decision: adopt Recharts (rendering) informed by Tremor's chart _design_; wrap in Ember-styled chart components. This is a v1.5 UX lift, not launch work. Net-new.**

### `Avatar`, `ThemeToggle`, `PasswordStrengthMeter` — **stay custom** · 2/2/3 files

Below the "stabilized across 2+ screens with real reuse pressure" bar, or genuinely app-specific (password meter's scoring, theme toggle's specific token wiring). **Decision: leave in EmberFlow; revisit only if a second Ember product needs them.**

---

## Summary table

| Component                                    | Tier | Verdict                                                                               |
| -------------------------------------------- | :--: | ------------------------------------------------------------------------------------- |
| Button                                       |  1   | Become Ember UI (extract first)                                                       |
| Card (+variants)                             |  1   | Become Ember UI                                                                       |
| Input/Textarea                               |  2   | Become Ember UI (after asterisk cleanup)                                              |
| Badge/Chip                                   |  2   | Become Ember UI; StatusBadge → configurable                                           |
| Loading                                      |  2   | Become Ember UI                                                                       |
| Modal/ConfirmDialog/Drawer                   |  2   | Complete the module (audit focus-trap vs Radix first)                                 |
| Table                                        |  3   | Stay custom; adopt TanStack logic if it grows                                         |
| EmberSelect                                  |  3   | Fix positioning (Floating UI) or replace with Radix Select — **do not extract as-is** |
| Tooltip                                      |  3   | Adopt Radix (net-new)                                                                 |
| Dropdown/action menu                         |  3   | Adopt Radix (net-new)                                                                 |
| Charts/Analytics                             |  3   | Adopt Recharts + Tremor design (net-new, v1.5)                                        |
| Avatar / ThemeToggle / PasswordStrengthMeter |  3   | Stay custom                                                                           |

**Guiding principle (unchanged):** never clone. Where an OSS primitive solves a hard problem (focus management, floating positioning, chart math), adopt its _engineering_ under Ember's _visual identity_. Where Ember's custom version is already good and identity-defining (Button, Card), extract and keep it. The goal is a premium, opinionated system — not a re-skinned shadcn.

---

# Ember UI v1.5 Motion System

> **Documentation-only plan, added under launch freeze (2026-07-30). Nothing here is implemented. No code, no extraction.** Sources analyzed in `EMBER_UI_GUIDE.md` → Motion Inspiration Library. This becomes real work only post-launch (aligns with `V1.5_ROADMAP.md` → Milestone D/F).

Ember's motion is **calm-premium**: motion earns its place, never decorates. Everything below is bound by the design bible (fade/spring/slide/subtle-scale; **no bounce/gimmick**; `prefers-reduced-motion` honored; CSS-first).

### Motion hierarchy (the organizing idea — define this first)

A three-tier budget so motion has a consistent "loudness," and nothing competes:

- **Tier 0 — Chrome** (`~120ms`, `--duration-fast`): functional feedback — button press, focus ring, hover lift, toggle. Instant-feeling, never noticed.
- **Tier 1 — Content** (`180–400ms`, `--duration-base/slow`): data appearing — card/table fade-in, list stagger, price counter, progress fills. Smooth, supportive.
- **Tier 2 — Signature moments** (richer, longer, rarer): the few deliberately memorable beats — upgrade-to-Pro success, AI/generation "thinking," a completed export. Richer motion is _allowed_ here (still tasteful) precisely because it's rare.

### Planned motion primitives / patterns

| Idea                               | Tier | Approach (constraint-bound)                                                                                                                                                                                                                                                                                                        | Source studied                   |
| ---------------------------------- | :--: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Premium page loaders**           | 1–2  | Keep the scoped `LoadingSpinner` as default; add an `EmberThinkingOrb` for generative/heavy states (Tier 2)                                                                                                                                                                                                                        | Orbs, Motion                     |
| **Route transitions**              |  1   | One shared enter/exit convention across `/app/*`; the case where adopting **Motion** (`AnimatePresence`) is justified (CSS can't do exit)                                                                                                                                                                                          | Motion.dev                       |
| **Skeleton loaders** ⚠️            |  —   | **EXCLUDED in EmberFlow** by the standing Loading-States rule ("do not introduce skeleton screens anywhere"). May exist as an Ember UI primitive for _other_ Ember Holdings products, but must NOT be adopted in EmberFlow unless that rule is deliberately revisited. Documented here only because it was on the brainstorm list. | Magic UI (shimmer)               |
| **Empty-state motion**             |  1   | Subtle entrance on the existing `EmptyState` (fade/slide already used); optionally a Rive illustration for one _signature_ empty state                                                                                                                                                                                             | Rive                             |
| **Success animations**             |  2   | SVG checkmark that draws itself (`stroke-dashoffset`); restrained — a draw, never a confetti burst                                                                                                                                                                                                                                 | Anime.js, CSS                    |
| **Billing animations**             |  2   | "Welcome to Pro" moment on upgrade success (the animated price counter already exists); a calm celebratory beat, not fireworks                                                                                                                                                                                                     | Animate UI                       |
| **AI generation animations**       |  2   | `EmberThinkingOrb` — the ambient gradient-orb "thinking" state                                                                                                                                                                                                                                                                     | Orbs                             |
| **Proposal generation animations** |  2   | Thinking orb + progressive content reveal as sections generate                                                                                                                                                                                                                                                                     | Orbs, Motion                     |
| **Invoice sent animation**         |  2   | A brief, tasteful send micro-motion (paper-plane/lift-off) on "Mark sent"/send — one beat, then out of the way                                                                                                                                                                                                                     | Magic UI                         |
| **Floating particles**             | 0–1  | **Very** subtle ambient only (a few slow, low-opacity motes), opt-in, reduced-motion off; never a busy particle field (would violate "calm/never flashy")                                                                                                                                                                          | React Bits, Kokonut              |
| **Ambient backgrounds**            |  0   | Extend the existing radial-glow (`reset.css`) tastefully into the app interior — subtle, dark-first                                                                                                                                                                                                                                | Kokonut, Vengeance (dialed down) |
| **Glass morphism**                 |  0   | Extend the existing single `backdrop-filter` use into a consistent glass token/treatment for elevated surfaces                                                                                                                                                                                                                     | Origin UI, Kokonut               |
| **Depth**                          | 0–1  | Layered shadow + very subtle parallax/scale on elevation; codify the existing floating-card language into depth tokens                                                                                                                                                                                                             | (design bible)                   |

### Guardrails

- Every Tier 2 moment ships with a reduced-motion fallback that still communicates state (e.g. the orb becomes a static glow; the checkmark appears without drawing).
- Prefer **one** shared motion system (tokens + a small set of primitives) over per-page bespoke animation — the drift risk is exactly what Ember UI exists to prevent.
- Measure: signature moments must not cost jank (60fps) or block interaction.

---

## Future Loader Library

Loaders/indicators worth recreating **later** (post-launch). Documentation only — do not implement. `Priority` assumes AI/generation features land in v1.5; adjust if they don't.

| Loader                                         | Purpose                                          | Complexity |         Priority          | Inspiration                              |
| ---------------------------------------------- | ------------------------------------------------ | :--------: | :-----------------------: | ---------------------------------------- |
| `LoadingSpinner` (exists)                      | Default scoped loading indicator                 |     —      |           Keep            | current                                  |
| `ProgressRing` (exists, extracted)             | Determinate circular progress / period runway    |     —      |           Keep            | HeroUI                                   |
| `ProgressBar` (exists, extracted)              | Determinate linear progress w/ thresholds        |     —      |           Keep            | Tremor                                   |
| **EmberThinkingOrb**                           | Ambient "AI/generation is thinking" state        |    High    |    High (if AI ships)     | Orbs                                     |
| **SVG success check**                          | Signature success confirmation (draws itself)    |    Low     |          Medium           | Anime.js / CSS                           |
| **Document-generation progress**               | Long PDF/export progress (orb + % + stage label) |   Medium   |          Medium           | Orbs + ProgressBar                       |
| **Route-transition loader**                    | Cross-fade/slide between `/app/*` routes         |   Medium   |          Medium           | Motion.dev                               |
| **Ambient page-load glow**                     | Subtle brand glow settling in on first paint     |    Low     |            Low            | CSS / Kokonut                            |
| **Shimmer/skeleton** ⚠️                        | Placeholder-shape loading                        |    Low     | **Excluded in EmberFlow** | Magic UI — Ember-UI-only, other products |
| **Inline button spinner** (exists in `Button`) | In-place async feedback                          |     —      |           Keep            | current                                  |

**Recreation rule (unchanged):** each of these is a _technique to own_, Ember-branded and reduced-motion-safe — not a dependency to import (except Motion.dev for genuine exit/layout orchestration, and Rive/Anime.js only for a specific signature illustration/sequence). Understand → improve → surpass.
