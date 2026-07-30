# Ember UI Guide

Read this before building any UI in this repo. It's the practical companion to the "Ember UI" section in `CLAUDE.md` — that section has the rules; this file has the workflow, the folder conventions, and the current catalogue.

## What Ember UI is

Ember UI is the canonical, cross-product component/design system for every Ember product — EmberFlow today, others later. It lives outside this repo, at `~/Desktop/Ember UI/`, so it survives independently of any one product's codebase. EmberFlow *consumes* Ember UI; it never the other way around.

The rule that makes this work: **only polished, production-grade, genuinely reusable pieces belong there.** No experiments, no broken drafts, no one-off glue code. If something is EmberFlow-specific business logic wearing a generic hat, it stays in EmberFlow.

## Before building anything nontrivial

1. **Check the catalogue first.** Open `~/Desktop/Ember UI/README.md` — it's a table of every module already extracted. If something close enough exists, adapt it in place rather than building parallel.
2. **Study `/references` before designing.** The repo root's `/references` folder has local clones of shadcn/ui (as `ui`), Magic UI, Origin UI, Animate UI, Radix UI, Framer Motion, React Bits, Mantine, HeroUI, Chakra UI, Tremor, and Headless UI. For anything nontrivial, look at **at least three** of the relevant ones before writing a line of Ember code. Compare their approaches — what each gets right, what each gets wrong (accessibility gaps, bloat, rigid APIs) — then design the Ember version informed by all of them, not a copy of any one.
3. **Never copy-paste a component wholesale.** Extract the pattern (the interaction model, the accessibility approach, the animation timing), then implement it in Ember's own visual language (dark-first, matte charcoal, floating cards, terracotta accent — see `CLAUDE.md` → Design System).
4. **Build it inside EmberFlow first**, wired to real data, tested against the real app. Don't design components in a vacuum.
5. **Once it's genuinely reusable and polished, extract it** to `~/Desktop/Ember UI/` following the layout below. "Reusable" means: no EmberFlow-specific business logic, no hardcoded copy that only makes sense for invoicing/freelancers, and it would make sense dropped into an unrelated Ember product with only its data/config swapped.

## Extraction layout

Each module is its own folder under `~/Desktop/Ember UI/`, containing whatever subset of the following actually applies:

```
~/Desktop/Ember UI/<module-name>/
├── README.md          # what it is, why it exists, usage example, dependencies, install notes
├── PROMPT.md           # a ready-to-use AI prompt that can recreate/adapt the module from scratch
├── .env.example         # if it needs configuration
├── components/           # UI: .jsx + its .css, no app-specific imports
├── client/               # frontend service/hook code, if it's a backend-integration module
├── api/                  # backend routes, if it's a backend-integration module
├── sql/                  # migrations, if it touches a schema
└── scripts/              # verification/test harnesses
```

`polar-billing/` (backend billing module) and `components/` (currently empty — nothing UI-layer has been extracted yet) are the two entries that exist today. Update `~/Desktop/Ember UI/README.md`'s catalogue table every time something new is added.

## Research sources with no local clone

Browse these directly when a pattern isn't covered by anything in `/references`: reactbits.dev, kokonutui.com, motion.dev, animejs.com, rive.app.

## Current catalogue (keep in sync with `~/Desktop/Ember UI/README.md`)

| Module | Kind | Status |
|---|---|---|
| `polar-billing/` | Backend module | Extracted 2026-07-28 from EmberFlow's Paddle→Polar migration. |
| `components/segmented-control/` | Component | Extracted 2026-07-30 from the Subscriptions page's Monthly/Yearly cadence toggle. Mantine `FloatingIndicator`-style measured-rect sliding indicator. |
| `components/progress-ring/` | Component | Extracted 2026-07-30 from the Subscriptions page's renewal ring. HeroUI SVG technique + Mantine flat prop API; generalized off billing-period date math to a plain 0–1 `value`. |
| `components/progress-bar/` | Component | Extracted 2026-07-30 from the Subscriptions page's usage meters. Tremor-inspired auto-derived warning/danger threshold coloring. |
| `components/item-row/` | Component | Extracted 2026-07-30 from the Subscriptions page's billing-history row. Chakra `DataList` label/value split + Mantine `List` icon-slot convention. |
| `components/animated-number/` | Hook | Extracted 2026-07-30 from the Subscriptions page's price counter. animate-ui `CountingNumber`'s prop shape, reimplemented framework-free (no framer-motion); deliberately did not adopt overshoot/"back" easing — see the module's README for why. |
| `components/modal-dialog/` | Component | Icon-medallion feature (HeroUI `AlertDialog.Icon`-inspired) extracted 2026-07-30 and applied to EmberFlow's existing shared Modal/ConfirmDialog, retroactively upgrading every confirm dialog in the app. The modal/focus-trap/drawer mechanics predate this pass and weren't re-researched against references — flagged as a follow-up. |
| UI primitives (Button, Card, Table, Badge, etc.) | Components | Not yet extracted — still living only in `frontend/src/components/ui/`. First candidates once a component has stabilized across two or more real EmberFlow screens. |

---

## Motion Inspiration Library

Curated study catalog of open-source motion/animation sources. **Study, don't clone** — the Ember philosophy (understand → improve → surpass): take the best idea, strip what's gimmicky, rebuild it in Ember's calm-premium language (dark-first, terracotta, no bounce, `prefers-reduced-motion` respected), make it more composable and better documented than the source. "Recreate" = extract the technique and own it (no runtime dep). "Depend" = adopt the library where it solves a genuinely hard problem better than we could.

> **Documentation-only, added under launch freeze (2026-07-30). Nothing here is implemented.** These inform the *Ember UI v1.5 Motion System* (see `EMBER_UI_TIERING.md`), which is post-launch work.

### Cross-cutting Ember constraints (apply to every source below)
- **Calm > flashy.** The brand is "calm, premium, trustworthy… never playful, noisy, flashy, over-designed." Reject anything that reads as a gimmick.
- **No bounce / overshoot** on functional motion (Motion Rules). Reserve richer motion for *signature moments* only.
- **CSS-first**; add a JS animation dependency only when the effect genuinely can't be done well in CSS.
- **`prefers-reduced-motion`** is honored everywhere (already true of `useAnimatedNumber`).
- **Skeleton screens are excluded from EmberFlow** by standing rule — see the ⚠️ note in the Motion System roadmap.

### The catalog

#### 1. Orbs — `orbs.jakubantalik.com` ("Thinking Orbs")
A curated set of animated "thinking/processing" orbs — the AI-assistant genre of ambient gradient blobs that morph, glow, and drift to signal "intelligence at work" (vs. a mechanical spinner). *(The live page is a JS-rendered showcase; this documents the motion pattern it exemplifies, not a per-orb teardown.)*
- **Strengths:** best-in-class at conveying an *ambient processing/thinking* state; organic gradient morph + soft glow + slow orbital drift reads as alive and premium; calm, not busy. Perfect emotional fit for "the system is generating something for you."
- **Weaknesses:** niche (really only for AI/generative/heavy-compute states); blur/filter-heavy versions can be GPU-costly; not a general-purpose loader.
- **Worth studying:** the gradient-orb morph, the layered glow pulse, the slow drift easing, the sense of depth from stacked translucent layers.
- **Animation quality:** very high — the genre benchmark for "AI is thinking."
- **Production suitability:** high *for generative/AI/long-compute states specifically*; use sparingly, never as the default spinner.
- **Recreate or depend:** **Recreate** — CSS/SVG-driven, Ember-branded (terracotta/ember gradient). No npm package to depend on, and Ember should own its own "thinking" signature. Candidate name: `EmberThinkingOrb`.

#### 2. Motion.dev (Motion / ex-Framer Motion) — `motion.dev`
The industry-standard React animation engine.
- **Strengths:** springs, layout animations, gestures, scroll-linked motion, and — most valuable — `AnimatePresence` exit animations (which CSS can't do cleanly). Excellent API + docs.
- **Weaknesses:** bundle weight; EmberFlow deliberately stays CSS-first and does **not** depend on it yet; overkill for simple fades.
- **Worth studying:** `AnimatePresence` (route/modal exit), `layout` animations, spring configs, `useScroll`. Its shipped easing presets (`easeOut`, `backOut`, `anticipate`) are worth reading even where we don't import them (already mined for `useAnimatedNumber`).
- **Animation quality:** reference-grade.
- **Production suitability:** very high, at the cost of a dependency.
- **Recreate or depend:** **Selectively depend later** — adopt for genuinely complex orchestration (route transitions, shared-layout animation) where CSS falls short; keep CSS for everything simple. The one library on this list worth a real runtime dependency, and only for the hard cases.

#### 3. Anime.js — `animejs.com`
Framework-agnostic timeline + SVG animation engine.
- **Strengths:** powerful timeline sequencing, SVG line-drawing/morphing, stagger; relatively light; not React-coupled.
- **Weaknesses:** imperative API (less React-idiomatic); another dependency.
- **Worth studying:** SVG stroke-draw (a success checkmark that *draws itself*), staggered timelines.
- **Animation quality:** high, especially for SVG.
- **Production suitability:** good for one-off complex SVG sequences (a signature success moment).
- **Recreate or depend:** **Depend only for a specific complex SVG sequence.** Most check-draws can be a CSS `stroke-dashoffset` or a tiny RAF — reach for anime.js only when a timeline is genuinely intricate.

#### 4. Rive — `rive.app`
Designer-authored interactive vector animations with runtime **state machines**.
- **Strengths:** genuinely *interactive* illustrations (respond to hover/drag/state), tiny runtime, designer-owned `.riv` assets.
- **Weaknesses:** requires the Rive editor + a runtime dep + authored assets; massive overkill for UI micro-motion.
- **Worth studying:** state-machine-driven hero illustrations, interactive empty/onboarding states.
- **Animation quality:** very high for illustration.
- **Production suitability:** high for a *signature* hero/empty-state/onboarding illustration; wrong tool for chrome/loaders.
- **Recreate or depend:** **Depend, very selectively** — only where an interactive illustration adds real value (e.g. a signature empty state or onboarding moment). Never for loaders or transitions.

#### 5. React Bits — `reactbits.dev`
Large copy-paste catalog of animated React components.
- **Strengths:** big variety (text effects, animated backgrounds, cards); copy-paste, no dep lock-in.
- **Weaknesses:** many silently depend on framer-motion (even the "CSS tier"); quality varies; a lot leans flashy/gimmicky (against Ember restraint).
- **Worth studying:** animated backgrounds, text-reveal effects, the counter (algorithm reference — already used for `useAnimatedNumber`).
- **Animation quality:** mixed — some excellent, much over-designed.
- **Production suitability:** medium — cherry-pick, never adopt wholesale.
- **Recreate or depend:** **Recreate ideas** — copy-the-technique-and-own-it, strip the flash, Ember-ify. Never a runtime dependency.

#### 6. Kokonut UI — `kokonutui.com`
Modern animated Tailwind/React components (documentation-only source, no local clone).
- **Strengths:** polished, on-trend, premium-feeling animated components (glow buttons, animated cards, backgrounds).
- **Weaknesses:** Tailwind-coupled; overlaps Magic UI; can lean flashy; not locally cloned, so verify before relying.
- **Worth studying:** gradient/glow button treatments, animated card hover, tasteful background effects.
- **Animation quality:** high, modern.
- **Production suitability:** medium — aesthetic-direction reference.
- **Recreate or depend:** **Recreate ideas** — aesthetic reference only; Ember isn't Tailwind-first in the same way.

#### 7. Vengeance UI — `vengeanceui.com`
Premium animated component collection (documentation-only source, newer/less-established — **verify before relying**).
- **Strengths:** dramatic, high-contrast premium aesthetic; useful as a "bolder end of premium" reference point.
- **Weaknesses:** less battle-tested; limited public track record; its dramatic register can run counter to Ember's *calm* premium — filter hard.
- **Worth studying:** its depth/glow/contrast treatments, as a contrast case against Ember's calmer direction.
- **Animation quality:** high but dramatic (may over-shoot Ember's restraint).
- **Production suitability:** low-medium — study for ideas, don't depend.
- **Recreate or depend:** **Recreate ideas selectively**, dialed down to Ember's calm register.

#### 8. Magic UI — `magicui.design` (local clone studied)
Animated components on framer-motion + Tailwind.
- **Strengths:** high-quality micro-interactions — number ticker, animated borders/beams, shimmer, blur-fade, marquee.
- **Weaknesses:** framer-motion + Tailwind coupled; some effects flashy.
- **Worth studying:** `NumberTicker` (already studied for the counter), animated border/beam, `BlurFade`, shimmer.
- **Animation quality:** high.
- **Production suitability:** medium-high (cherry-pick).
- **Recreate or depend:** **Recreate ideas** — took the counter *algorithm*, not the dep; same approach for the rest.

#### 9. Origin UI — `originui.com` (local clone studied)
Large, clean, accessible Tailwind component set (Base UI/Radix-backed).
- **Strengths:** breadth + accessibility; tasteful, *restrained* micro-interactions (the Switch's staggered CSS transition is a good Ember-fit).
- **Weaknesses:** Tailwind; more component-breadth than motion-depth.
- **Worth studying:** `Switch` (staggered transition timing — already mined for `SegmentedControl`), `Meter`, form-field motion.
- **Animation quality:** tasteful, restrained — strong Ember alignment.
- **Production suitability:** high for patterns; lighter on pure motion.
- **Recreate or depend:** **Recreate ideas** (already done for the segmented control).

#### 10. Animate UI — `animate-ui.com` (local clone studied)
Motion-first React component set.
- **Strengths:** genuinely animation-centric — `CountingNumber`, `SlidingNumber` (odometer roll), text-reveal primitives.
- **Weaknesses:** framer-motion dependent; newer/less battle-tested.
- **Worth studying:** `SlidingNumber` (odometer), `CountingNumber` (prop shape — already borrowed), text-reveal.
- **Animation quality:** high, motion-forward.
- **Production suitability:** medium (cherry-pick technique).
- **Recreate or depend:** **Recreate ideas** — deliberately did *not* adopt the odometer/overshoot for the price counter (conflicts with Ember Motion Rules); good candidate for a *signature* stats moment where richer motion fits.

### Where the orb pattern fits across the three scopes
- **EmberFlow (the product):** generative/AI states (the roadmap's "AI generation" / "proposal generation" moments), long-running PDF export/generation, and any "heavy compute, please wait" moment where a spinner feels too mechanical. Sparingly — a signature moment, not chrome.
- **Ember UI (the system):** a canonical `EmberThinkingOrb` / `ProcessingOrb` primitive — the Ember-branded ambient "intelligence at work" indicator, offered alongside (not replacing) `LoadingSpinner`, with clear guidance on when to use which.
- **Ember Holdings (future products):** the thinking orb becomes a **cross-product motion signature** — any future AI-centric Ember product uses the same orb language so "an Ember product is thinking" looks and feels consistent across the portfolio.
