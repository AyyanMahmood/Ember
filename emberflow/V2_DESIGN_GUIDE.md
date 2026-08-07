# EmberFlow V2 Design Guide

**Prepared by:** Design system review, ahead of V2
**Date:** 2026-08-06
**Method:** Full read of every stylesheet in `frontend/src/styles/` (all 23 component CSS files plus tokens/reset/typography/layout/utilities), the design-system component JSX (`components/ui/*`), and the document-rendering subsystem (`document-studio/`). Verified every claim below against the actual CSS cascade and import order (`styles/index.css`) rather than assuming from file names. No code was modified to produce this document.
**Scope discipline:** per the brief, this document ignores implementation (business logic, data flow, architecture — covered in `V2_ARCHITECTURE.md`) and focuses purely on what the product _looks and feels like_. Bugs that happen to be visual (e.g. the native `<select>` chevron color) are covered here in design terms; their engineering severity/effort is tracked in `V2_MASTER_AUDIT.md`.
**Companion documents:** `CLAUDE.md` states the design _philosophy_ (dark-first, OpenClaude-inspired, calm-premium). This document audits whether the _implementation_ actually lives up to it, file by file, and defines the concrete standard V2 should hold components to.

---

## How to read this document

For each topic: **what EmberFlow already does well** (preserve this into V2 without re-litigating it), followed by **numbered inconsistencies**, each in the form:

> **Problem** — what's actually in the code, with file:line.
> **Why it hurts** — the concrete experience cost, not just "it's inconsistent."
> **New standard for V2** — the one rule to encode so this class of drift can't recur.

---

## Table of Contents

1. [Typography](#1-typography)
2. [Spacing System](#2-spacing-system)
3. [Component Consistency](#3-component-consistency)
4. [Color Usage](#4-color-usage)
5. [Animations](#5-animations)
6. [Loading States](#6-loading-states)
7. [Empty States](#7-empty-states)
8. [Forms](#8-forms)
9. [Cards](#9-cards)
10. [Buttons](#10-buttons)
11. [Tables](#11-tables)
12. [Charts](#12-charts)
13. [Sidebar](#13-sidebar)
14. [Navbar](#14-navbar)
15. [Dialogs](#15-dialogs)
16. [Shadows](#16-shadows)
17. [Blur Effects & Glassmorphism](#17-blur-effects--glassmorphism)
18. [Visual Hierarchy](#18-visual-hierarchy)
19. [V2 Design-Language Checklist](#19-v2-design-language-checklist)

---

## 1. Typography

**What's working:** `tokens.css` defines a genuinely complete, well-considered type scale — `--text-display-xl/lg/md`, `--text-heading-xl/lg/md/sm`, `--text-body-lg/body/body-sm`, `--text-label`, `--text-caption`, `--text-overline`, `--text-mono` — paired with matching line-height tokens (`--leading-display` at a tight `0.85` for hero display type, `--leading-body` at a readable `1.6`) and a full weight scale from `--weight-thin` (100) to `--weight-black` (900). Inter is used consistently as the sole typeface, per CLAUDE.md's rule. This is a strong foundation — the scale itself should carry into V2 unchanged.

**Inconsistencies:**

1. **Component-level font sizes routinely bypass the token scale with bespoke values that sit _between_ documented steps.**
   - Problem: `.stat-card__value { font-size: 1.75rem }` (cards.css), `.pricing-card strong` / `.pricing-card__price { font-size: 3rem }` (both cards.css and layout.css — see §3), `.side-link { font-size: 0.8125rem }` (sidebar.css), `.table td { font-size: 0.9375rem }` (tables.css), `.brand-mark { font-size: 1.1rem }` (sidebar.css), `.auth-page .brand-mark { font-size: 1.35rem }` (layout.css). None of these match any token in `tokens.css`'s type scale.
   - Why it hurts: the type scale exists specifically so every piece of text in the product reads as part of one considered hierarchy. Every bespoke value is a small, silent exception — individually invisible, but in aggregate they mean the "scale" is actually a loose guideline that gets overridden constantly, which is exactly the failure mode a design-token system exists to prevent. A designer or engineer reaching for "the number size" or "the nav label size" in V2 has no single source of truth to check.
   - New standard: every `font-size` declaration in component CSS must resolve to a `var(--text-*)` token. Where a genuinely new size is needed repeatedly (e.g. the ~28px "big stat number" role used on Dashboard/Pricing/Subscriptions — see §18 finding 3), add it to the scale once as a named token (e.g. `--text-display-sm` or `--text-stat`) rather than restating the raw value at each call site.

2. **The same semantic font-weight is expressed as both a token and a raw number, in different files.**
   - Problem: `.plan-hero__name { font-weight: 600 }` (subscriptions.css) vs. `.panel__title { font-weight: var(--weight-bold) }` (layout.css, `--weight-bold: 700`, not actually the same value, but adjacent examples like `.item-row__title { font-weight: 500 }` vs. `var(--weight-medium)` used elsewhere for the identical 500 weight show the pattern clearly — segmented-control.css's `font-weight: 500` and item-row.css's `font-weight: 500` are two more literal-500s that should be `var(--weight-medium)`).
   - Why it hurts: this doesn't look broken today (500 and `var(--weight-medium)` render identically), but it silently breaks the moment someone retunes the weight scale for V2 — every hardcoded literal becomes invisible drift that only a manual CSS audit (like this one) will ever catch.
   - New standard: no raw numeric `font-weight` values in component CSS — token only, enforced by a lint rule if V2 adopts stylelint.

---

## 2. Spacing System

**What's working:** the 8px scale (`--space-1` = 4px through `--space-20` = 80px) is applied consistently for `gap`, `margin`, and most `padding` across the entire app — genuinely the best-followed token category in the codebase. This should be the unchanged foundation for V2.

**Inconsistencies:**

1. **Control-internal padding (the space inside an input, button, badge, or select) almost never uses the spacing scale — it reaches for arbitrary rem values instead, consistently across the whole app.**
   - Problem: `.input`/`.textarea`/`.select { padding: 0.78rem 0.85rem }` (inputs.css), `.ember-select__trigger { padding: 0.78rem 0.85rem }` (select-menu.css, matched deliberately to `.input` — good), `.file-upload { padding: 0.6rem 0.9rem }`, `.ember-select__option { padding: 0.55rem 0.6rem }`, `.brand-studio__doc-tab { padding: 0.4rem 0.85rem }`, `.badge { padding: 0.35rem 0.65rem }`. None of these are `--space-*` values (which jump 8px → 12px → 16px with nothing between).
   - Why it hurts: this isn't visually broken — the values were clearly chosen by eye and are mutually consistent within "control padding" as its own informal category — but it means the documented spacing system (CLAUDE.md: "prefer spacing scale over arbitrary values") quietly doesn't apply to one of the most common surfaces in the app (every form control, every badge, every tab). It also means the scale itself has a real gap: there is no token between 8px and 12px, which is exactly the range control padding needs.
   - New standard: either (a) accept and formalize control-internal padding as its own token pair — `--control-padding-y` / `--control-padding-x` — set once and referenced everywhere a control's internal padding is declared, or (b) extend the space scale with a half-step (`--space-2-5: 10px`) to close the gap. Either is fine; picking one and applying it everywhere is what matters.

---

## 3. Component Consistency

This is the section with the highest-value findings in this review — the CSS cascade itself contains genuine duplicate/conflicting component definitions, not just stylistic drift. Verified directly against `styles/index.css`'s import order (`layout.css` imports before every file in `components/`), so in every case below there is one _winning_ definition (whichever loads last) and one fully **dead** definition that still exists in the codebase and could mislead whoever edits it next expecting it to have an effect.

1. **`.icon-button` is defined twice, with two different sizes.**
   - Problem: `layout.css:485-513` defines `.icon-button` at `2.4rem × 2.4rem`. `components/buttons.css:141-177` defines it again at `2.75rem × 2.75rem`. Because `buttons.css` imports after `layout.css`, its definition wins — `layout.css`'s copy is entirely dead CSS.
   - Why it hurts: today this "just works" because the later file wins consistently. But it means the codebase carries a live landmine: anyone editing `layout.css`'s `.icon-button` (the natural place to look, since it's the more general-sounding file) will see zero effect and have no idea why, and anyone auditing icon-button sizing by grep will find two different numbers with no indication which is real.
   - New standard: one definition per component, living in its own component stylesheet (`components/buttons.css` for `.icon-button` — already correct), never in `layout.css`. `layout.css` should contain only page-shell/grid layout rules, not component styling.

2. **`.file-upload`, `.form-grid`, `.form-actions`, and `.actions` are each defined twice — once in `layout.css`, once in `components/inputs.css` — and `.actions`/`.form-actions` are additionally duplicated a second time _within `layout.css` itself_ (lines 465-470 and again, verbatim, at lines 880-886).**
   - Why it hurts: same failure mode as #1, at greater scale — this is a pattern, not an isolated slip. It strongly suggests `layout.css` predates the later introduction of dedicated `components/*.css` files and was never cleaned up when the more disciplined per-component files were introduced. Confirmed further by finding #3 below.
   - New standard: audit `layout.css` for every selector that also exists in `components/*.css` and delete the shadowed copy from `layout.css`. `layout.css` should shrink to page-shell grids only (`.app-shell`, `.content`, `.page-stack`, breakpoint overrides) — everything else belongs in a component file.

3. **`.pricing-card` is defined twice with genuinely different visual output, not just redundantly — confirming the "legacy, pre-BEM version left behind" pattern.**
   - Problem: `components/cards.css:85-108` defines the current, BEM-child-class version (`.pricing-card__price`, `.pricing-card__period`, etc.) whose `--highlight` variant combines _two_ shadows: `box-shadow: var(--shadow-highlight), var(--shadow-elevated)`. `layout.css:946-957` defines an older version targeting a bare `strong` selector instead of a BEM class (`.pricing-card strong { font-size: 3rem }`), whose `--highlight` variant uses only _one_ shadow (`var(--shadow-highlight)` alone). `cards.css` wins by import order, so the weaker, single-shadow highlight treatment in `layout.css` is not just dead — it's a **visibly different, superseded design** that was apparently replaced during a BEM refactor and never deleted.
   - Why it hurts: beyond the maintenance risk of #1/#2, this is direct evidence that the design system was refactored once already (bare-selector → BEM) without a cleanup pass, which is exactly the kind of debt that compounds silently release over release. A V2 rebuild inheriting this file structure would import the same ambiguity from day one.
   - New standard: treat this finding as the trigger for a full audit pass — grep every component-named selector for duplicate definitions across `layout.css` and `components/*.css` before V2 styling work begins, not just the three families caught by manual review here.

4. **`Card`'s `variant="elevated"` maps to a CSS class that doesn't exist.**
   - Problem: `components/ui/Card.jsx:16` — `variantClasses.elevated = 'panel panel--elevated'`. Grep across every `.css` file in the repo: `.panel--elevated` is never defined. Only `.panel--strong` and `.panel--interactive` exist.
   - Why it hurts: the component's public API advertises a visual variant that silently does nothing (falls back to bare `.panel` styling). No current caller uses it (confirmed), so it's latent rather than actively broken — but it's exactly the kind of API-surface/implementation mismatch that produces a confusing bug the day someone _does_ reach for `variant="elevated"` expecting a visually distinct, more-elevated card and gets the default instead.
   - New standard: either implement `.panel--elevated` (a natural next step up from `--shadow-md` to `--shadow-elevated`, filling the gap between `default` and the hover-only elevated state other cards already have) or remove the variant from the component's API. Don't ship a variant name with no corresponding style.

5. **`CardBody` and `CardFooter` are exported, fully unused, and target CSS classes that don't exist.**
   - Problem: `components/ui/Card.jsx:74-100` exports `CardBody`/`CardFooter`, rendering `.panel__body` / `.panel__footer`. Neither class has any CSS rule anywhere in the stylesheet, and neither component is imported anywhere else in the app (confirmed via grep).
   - Why it hurts: two members of the `Card` family exist only as unstyled, unused dead code — a false signal to anyone assembling the Card family's API surface about what's actually available and supported.
   - New standard: remove both from the exported API for V2, or build them out properly (padding/border-top divider for `CardFooter`, matching `.modal-footer`'s existing, already-correct treatment) and adopt them somewhere real, so the Card family's documented sub-components match what's actually shipped.

6. **Four visually distinct "card" treatments exist for what reads, to a user, as the same object.**
   - Problem: (a) `.panel`/`.feature-card`/`.stat-card` — translucent `--color-surface-glass` background, `--radius-md`, `--shadow-md`; (b) `.lp-feature-card`/`.lp-glimpse-card` (landing.css) — glass or `--color-surface-strong` background, `--radius-lg`, `--shadow-sm` jumping straight to `--shadow-elevated` on hover; (c) `.lp-trust-item` — flat `--color-surface-sunken`, `--radius-lg`, **no shadow at all**; (d) `.modal-card` — opaque `--color-surface-strong`, `--radius-lg`, `--shadow-xl`.
   - Why it hurts: a user moving from the Landing page (treatment b/c) to the in-app Features/Dashboard experience (treatment a) sees the geometry of "a card" quietly change — different corner roundness, different depth, different translucency — with no functional reason for the difference. This is the single largest visible source of "doesn't feel like one product" in the whole review.
   - New standard: define exactly **two** elevation tiers for surfaces — a floating/glass tier (`.panel`, used for in-app content cards — radius-md, shadow-md, translucent) and a solid/heavy tier (`.modal-card`, used only for the highest z-index — radius-lg, shadow-xl, opaque) — and make every card-like component in the app, including the landing page's, choose one of exactly those two rather than inventing a third or fourth.

---

## 4. Color Usage

**What's working:** the single-accent-color discipline (`--color-accent`, a deliberately muted terracotta, contrast-tuned per the detailed comment in `tokens.css`) is genuinely well-executed — confirmed via full review that no second competing brand hue exists anywhere in the app, and status colors (`--color-success/warning/danger/draft`) are reserved for semantic state, never decoration. This is a real strength and should be the unchanged rule for V2: **one accent, semantic-only status color, never introduce a second brand hue.**

**Inconsistencies:**

1. **`StatusBadge`'s "blue" variant name renders in accent-orange, not blue.**
   - Problem: `components/ui/Badge.jsx:47` maps the `sent` invoice status to `variant: 'blue'`, and `badge--blue` (badges.css:33-36) is styled with `background: var(--color-accent-soft); color: var(--color-accent-strong)` — the terracotta accent, not any blue.
   - Why it hurts: the system has no blue anywhere, by design (§4 intro) — so a variant literally named `blue` is a false label that will mislead the next person extending the badge system, and it pre-squats the name a genuine future "info, distinct from brand accent" blue would naturally want.
   - New standard: rename the variant to `accent` (matching how every other accent-colored surface in the system is named — `--color-accent-soft`, `.progress-ring--accent`, etc.), and reserve `blue` (if ever needed) for a real, distinct hue.

2. **Hardcoded one-off colors bypass the token system in several component files, some redundantly right next to a token that already does the same job.**
   - Problem: `.brand-studio__lock-badge { background: rgba(10, 10, 10, 0.72); color: #fff }` (brand-studio.css:327-328) sits three lines below `.brand-studio__locked-inline-overlay { background: var(--color-overlay-surface) }` (brand-studio.css:233) — `--color-overlay-surface` already exists (`rgba(10, 12, 14, 0.92)` dark / `rgba(247, 248, 250, 0.92)` light) for exactly this "dark scrim, readable text" purpose, but the lock badge three lines away reaches for a fresh raw value instead. Also: `.early-supporter-badge` (badges.css:140-141, `#3a404a`/`#fff`, deliberately non-themed per its own comment — acceptable as a one-off but still worth a named token so a future palette pass doesn't miss it), `.button--primary`'s white text (buttons.css:75,82, see §10 finding 2).
   - Why it hurts: a raw color that happens to visually match a token today will silently diverge the moment the token is retuned (e.g. a future theme adjustment to `--color-overlay-surface`'s opacity) — the lock badge simply won't follow, and nobody will notice until a screenshot comparison catches it.
   - New standard: every color value in component CSS should be a `var(--color-*)` reference. If a genuinely new, deliberately non-themed color is needed (as `--early-supporter-badge` argues for itself), give it its own named token (`--color-early-supporter-bg`) rather than a bare hex, so it's at least discoverable and intentional rather than an invisible exception.

---

## 5. Animations

**What's working:** this is one of the strongest parts of the system. A real, consistent motion vocabulary exists (`--duration-fast/base/slow/slower`, `--ease-out/in-out/spring`), `prefers-reduced-motion` is honored globally with a single blanket override in `tokens.css` (not sprinkled per-component), and — most impressively — the two "signature moments" (Pro activation's traced ember ring, the app-entrance logo dissolve) are genuinely restrained, on-brand, and reserved for rare high-value events exactly as CLAUDE.md's motion rule prescribes ("richer motion allowed only for rare signature moments... never for chrome"). This system should carry into V2 essentially unchanged — it's a model for the rest of the design system to follow, not the other way around.

**Inconsistencies:**

1. **Entrance choreography exists on exactly one page.**
   - Problem: `subscriptions.css:15-26` gives `SubscriptionsPage` a bespoke staggered fade-in for its direct children (8 explicit `nth-child` delay rules). No other page — Dashboard, Invoices, Clients, Analytics — has any equivalent entrance treatment; they render instantly.
   - Why it hurts: a staggered reveal reads as "premium polish" specifically because of the contrast with instant rendering elsewhere — but here it's inverted: the one page that has it feels like a different, more finished product than its siblings, rather than users learning to expect it everywhere important content loads.
   - New standard: either extract this into a reusable `.stagger-in > *` utility applied consistently to every primary page's top-level sections, or deliberately reserve it for a defined category of "destination" pages (and document which) rather than one page having it by apparent accident of whoever built it last.

2. **Hover-lift magnitude is reinvented per component instead of being one shared value.**
   - Problem: `.stat-card-link:hover` lifts `-2px`, `.panel--interactive:hover` lifts `-1px`, `.pricing-card:hover` (cards.css) lifts `-2px`, `.lp-feature-card:hover` lifts `-3px`, `.feature-grid .panel:hover` (layout.css) lifts `-3px` — five slightly different distances for what is, in every case, the identical "this card is clickable" affordance.
   - Why it hurts: no single instance is jarring, but the inconsistency means there's no one place to retune "how much do interactive cards lift" for V2 — it's scattered across five files with five slightly different numbers that all mean the same thing.
   - New standard: one `--lift-hover: -2px` token (or a shared `.hoverable-card` utility class), used by every card-like hover treatment in the app.

3. **The landing page's hero mockup has the only continuous, infinitely-looping decorative animation in the app.**
   - Problem: `.lp-glimpse-card { animation: lp-float 7s var(--ease-in-out) infinite }` (landing.css) — a permanent, gentle float, correctly disabled under `prefers-reduced-motion` but otherwise looping forever.
   - Why it hurts: not necessarily wrong (a hero moment can justify more motion than chrome), but it's the one place in the entire app where "ambient, ongoing" motion exists rather than "responds to an event" motion — worth a deliberate yes/no for V2 rather than continuing by default because it's already there.
   - New standard: keep it if the Landing page is explicitly designated a "signature moment" surface (consistent with the Pro-activation precedent); otherwise convert to a one-shot entrance animation matching the rest of the system's "animate in, then settle" pattern.

---

## 6. Loading States

**What's working:** this is the second-strongest system in the app, alongside animations. A genuine contextual-loader family exists and is documented in code comments explaining _why_ each exists: plain `.spinner` reserved for buttons (deliberately unbranded — "a fancy loader on a button would be noise"), `.ember-spinner` (a branded conic-gradient comet arc) for scoped in-page regions, `.route-progress` (a top-of-viewport trickle bar that decelerates toward ~92% and completes only on unmount) for route/code-split transitions, and `.brand-loader` (a slow ember ring around the logo) for full-screen waits. CLAUDE.md's "no skeleton screens" rule is honored everywhere checked. **This should be adopted as the literal, unchanged V2 standard** — it's already better than what most SaaS products at this stage have.

**Inconsistencies:**

1. **`FeatureGate` is the one place the loading system's own rule is violated.**
   - Problem: `components/FeatureGate.jsx:13` — while checking plan status, it renders only a bare `<LoadingSpinner size="md" label="Checking plan..." />` with nothing else — no page header, no branded treatment, no preserved chrome — on `AnalyticsPage`, `ProposalsPage`, and `ProposalFormPage`.
   - Why it hurts: every other loading moment in the app preserves the surrounding layout and shows a small, scoped indicator only where content is genuinely missing (the standard this exact section documents above). This is the single place that standard isn't followed, and it happens to be on three real, user-facing routes.
   - New standard: `FeatureGate` should render the page's header/chrome unconditionally and gate only the content region below it, matching every other loading state in the app.

---

## 7. Empty States

**What's working:** `EmptyState` is a single, clean, consistently-used implementation (icon medallion + title + message + optional action) that correctly reuses the same soft-color-pair convention as badges and alerts for its semantic variants (`--warning`/`--danger`/`--success`). One component, one visual language, applied consistently — a good, preservable pattern.

**Inconsistencies:**

1. **A second, illustration-based empty-state treatment exists in CSS but has zero current callers.**
   - Problem: `.empty-state__illustration` (empty-state.css:67-72) styles an image-based alternative to the icon medallion, but grep confirms no page currently passes an `illustration` prop — every empty state in the shipped app uses the icon path.
   - Why it hurts: not a live inconsistency (nothing currently looks wrong), but it means the component's documented API has two supported empty-state "looks," only one of which has ever been exercised — a designer picking up the component has no working example of the illustration path to judge whether it actually looks right at any real size.
   - New standard: for V2, either put the illustration path into real use on at least one screen (e.g. a genuinely empty Dashboard on a brand-new account, which is exactly the moment a slightly bigger visual moment is justified) or remove the unused path so "empty state" has exactly one supported look.

---

## 8. Forms

**What's working:** `Input`/`Textarea`/native `Select` share one cohesive base treatment — matte `--color-input-bg` surface, consistent `1.5px` border, a real focus glow (`--shadow-focus`), and consistent error styling (`--input--error`). This shared foundation should carry into V2 unchanged.

**Inconsistencies:**

1. **Two different "pick one from a list" visual languages coexist in the same forms.**
   - Problem: `EmberSelect` (a fully custom, on-brand floating listbox with a correctly-tokenized chevron via `currentColor`/`var(--color-muted)`) is used for currency/country/template pickers, while the raw native `<select>` (`.select` in inputs.css) — used for the page-size control, a few Settings dropdowns, and wherever `EmberSelect` wasn't reached for — has a **hardcoded, off-palette chevron** left over from before the dark-first rebrand (`#6D675D`/`#3B82F6`, matching neither theme's current token values). A user can encounter both patterns inside the same form.
   - Why it hurts: this is the most visible single inconsistency in the entire review — a wrong-colored icon on a control type that appears on nearly every page with a form, and it's doubly avoidable because the _correct_ version (`EmberSelect`) already exists in the same codebase as the reference implementation.
   - New standard: adopt `EmberSelect` as the sole select pattern for V2 and retire the native `<select>`'s custom-styled chevron entirely (native selects should only appear where genuinely necessary, e.g. for OS-level accessibility affordances the custom component can't replicate — and even then, styled to match the current palette, never left stale).

2. **Auth forms use a deliberately different density/radius than every other form in the app.**
   - Problem: `layout.css`'s `.auth-page` block scopes a larger `--radius-xl` on buttons, `--radius-lg` on inputs, and a tighter label-to-input gap — all explicitly commented as intentional, auth-only overrides, not applied anywhere else (Settings, Invoice Form, Client Form all use the base `--radius-md`/`--radius-lg` treatment from `components/inputs.css`).
   - Why it hurts: defensible as "make the very first impression feel a little more premium," but it means EmberFlow currently ships two form densities depending on whether a user is signing up or already inside the product — a split that's real and deliberate today, but not written down anywhere as a permanent design rule, which makes it look like drift to anyone auditing the CSS cold (as this review did, before finding the comment explaining it).
   - New standard: keep the decision, but promote it from an inline CSS comment to an explicit, named rule in this document (done here) — and make a deliberate V2 call on whether the main app's forms should adopt the same slightly-softer radius everywhere, closing the split rather than perpetuating it as an auth-only exception.

---

## 9. Cards

(Cross-referencing §3, which covers the structural/duplication findings in depth — this section states the resulting standard plainly.)

**What's working:** the `Card` component's base API (variant + padding + optional interactive keyboard/role handling) is a sound foundation, and the interactive-card hover treatment (lift + border-color shift to accent + `--shadow-elevated` + a 1px accent-tinted ring) is a genuinely nice, premium-feeling detail applied consistently wherever it _is_ used.

**Inconsistencies:** all four are covered in full in §3 (findings 3, 4, 5, 6). Restated as the single design rule for V2:

> **New standard:** exactly two elevation tiers (floating/glass `.panel` and solid/heavy `.modal-card`), one canonical definition per selector (no `layout.css`/`components/*.css` duplication), a complete and accurate `Card` variant API (no `elevated` that does nothing, no unused/unstyled `CardBody`/`CardFooter`), used identically whether the card appears on the marketing site or inside the app.

---

## 10. Buttons

**What's working:** this is the most complete, internally consistent component family in the app. A full variant set (primary/secondary/ghost/danger/success/warning) pairs cleanly with a three-size scale (sm/md/lg), and the interaction model — hover lift + shadow, active press-scale (`scale(0.98)`), disabled dimming, a real focus-visible ring — is applied uniformly across every variant. **Adopt this file as the literal reference standard for how every other interactive component family in V2 should be structured** (buttons.css is the cleanest file in the entire stylesheet).

**Inconsistencies:**

1. **Primary-button text color is hardcoded rather than tokenized, echoing the `--color-on-accent` phantom-token issue found elsewhere.**
   - Problem: `.button--primary` and `.button--primary:hover` (buttons.css:75, 82) both hardcode `color: #FFFFFF`, while `layout.css`'s `.skip-link` reaches for `var(--color-on-accent, #fff)` — a token that is never actually defined in `tokens.css`. Two different mechanisms for the identical "white text on the accent color" value, and neither is a real, defined token.
   - Why it hurts: today both resolve to the same visible white, so nothing looks broken — but there is no single place to change "text color on an accent-colored surface" for V2 (e.g. if a future theme ever needs slightly-off-white for contrast tuning on a brighter accent). This is the same root cause as §3/§4's other hardcoded-color findings, surfaced a third time here because it's most visible on the single most-used component in the app.
   - New standard: define `--color-on-accent` for real in `tokens.css` (it already has an obvious value — `#FFFFFF` in both themes, per the existing fallbacks) and reference it from both `.button--primary` and `.skip-link`, eliminating the raw hex from both.

2. **Icon-only buttons render at two different sizes depending on which of the two competing `.icon-button` definitions (§3 finding 1) happens to be active.**
   - Why it hurts / New standard: identical to §3 finding 1 — restated here because it's a Buttons-family defect specifically, not just a CSS-hygiene one. Once the duplicate is resolved, icon buttons will consistently render at the `buttons.css` size (2.75rem base, already correctly the one with a `pointer: coarse` touch-target override).

---

## 11. Tables

**What's working:** the responsive strategy is genuinely well-executed and among the better patterns in the whole app — a horizontal-scroll table above 680px that converts cleanly to a stacked-card list below 680px, using `data-label` pseudo-headers (`content: attr(data-label)`) so column context survives the reflow without duplicating markup. This, plus the `pointer: coarse` touch-target bump on pagination controls, should be preserved as-is for V2.

**Inconsistencies:**

1. **Table cell text sizes are bespoke, undocumented values — the same systemic issue as §1, called out again here because tables are one of the highest-visibility surfaces in the product (Invoices, Clients, Proposals all lead with one).**
   - Problem: `.table th { font-size: 0.75rem }` (which happens to equal `--text-caption` but isn't written as the token) and `.table td { font-size: 0.9375rem }` (which matches _no_ token — it's a third, undocumented body-text size that exists only inside table cells, between `--text-body-sm` at 0.875rem and `--text-body` at 1rem).
   - Why it hurts: a table is one of the first things a user sees on Invoices/Clients/Proposals — its type size effectively defines "the app's default reading size" in the user's mind, and that size currently isn't traceable to the documented scale at all.
   - New standard: `.table th` should read `font-size: var(--text-caption)` explicitly; `.table td` should resolve to whichever of `--text-body-sm`/`--text-body` is the intended design decision (this review takes no position on which — that's a genuine design call for V2 to make once, then encode as a token reference).

---

## 12. Charts

**There are currently no charts anywhere in the product.** `AnalyticsPage.jsx` (confirmed by direct read of the file and its imports) is built entirely from `StatCard` components and a plain `.ranking-row` list — no bar, line, pie, or sparkline visualization exists anywhere in the codebase, despite `CLAUDE.md` explicitly naming Recharts as a "preferred addition... for Analytics charts and data visualization."

This isn't an inconsistency to fix — there's nothing to reconcile, since nothing exists yet. It's flagged here because it's the one area of this entire design review with **zero legacy debt**, which is a genuine advantage for V2: there is no stale chart palette, no orphaned chart-library CSS, no competing chart visual language to untangle (unlike nearly every other section in this document). The risk is purely forward-looking — if V2 introduces charts without a deliberate standard, the _first_ chart implementation will accidentally set the precedent (exactly how `.icon-button`'s size or `.select`'s chevron color became "the standard" by accident rather than by decision).

**New standard, to be set once, proactively, before the first chart ships:**

- **Color:** charts must draw exclusively from the existing semantic token set (`--color-accent`, `--color-success`, `--color-warning`, `--color-danger`, `--color-muted` for axes/gridlines) — never a separate "chart palette" with its own hues, which is the single most common way a design system fragments once data visualization enters the picture.
- **Surface:** a chart's containing card follows the same two-tier elevation rule as every other card (§9) — it is not a special third surface treatment.
- **Motion:** entrance/transition animation on chart data uses the existing `--duration-*`/`--ease-*` tokens, consistent with every other animated element in the app (§5) — no chart-library-default easing curves left un-overridden.
- **Typography:** axis labels and data labels use `--text-caption`/`--text-mono` (the latter already exists specifically for tabular/numeric contexts and is under-used elsewhere in the app — a chart is a natural first real use case).

---

## 13. Sidebar

**What's working:** the sidebar is the single best example in the codebase of the "retune in one place" discipline this whole document is arguing for elsewhere — every `--color-sidebar-*` token lives in one named, commented block in `tokens.css`, consumed only by `sidebar.css`. This is the pattern every other component family should be held to for V2, not an exception specific to the sidebar. The deliberate choice to keep the sidebar dark in _both_ light and dark theme ("dark is the primary sidebar experience," per its own code comment) is a clear, intentional, well-documented exception — worth stating explicitly as a **permanent V2 rule**, not something a future light-theme pass should "fix."

**Inconsistencies:**

1. **The primary navigation label's font size is a bespoke value outside the type scale.**
   - Problem: `.side-link { font-size: 0.8125rem }` — matches neither `--text-caption` (0.75rem) nor `--text-body-sm` (0.875rem). This is the label a user reads more often than almost any other text in the app (every navigation action passes through it).
   - Why it hurts: same root issue as §1/§11, elevated in importance here because of how frequently this specific text is read.
   - New standard: resolve to `var(--text-body-sm)` (0.875rem) unless a deliberate design decision sets a new named token for "compact nav label" — either is fine, but it should be a decision, not a leftover.

---

## 14. Navbar

EmberFlow has two navbars by design — the logged-out `.marketing-nav` and the authenticated `.topbar` — and that split itself is reasonable (different content, different user state). The finding below is about the one place they should behave identically and currently don't.

**Inconsistencies:**

1. **Only the marketing navbar is actually glass — the app's own topbar uses the same "glass" background token with none of the blur that makes it read as glass.**
   - Problem: both `.marketing-nav` (layout.css:767-769) and `.topbar` (topbar.css:3) set `background: var(--color-surface-glass)`, but only `.marketing-nav` also sets `backdrop-filter: blur(12px)`. Confirmed via full-codebase grep: this is the **only** `backdrop-filter` declaration anywhere in the app. `.topbar` is sticky over scrolling authenticated content exactly the way `.marketing-nav` is sticky over scrolling hero content — the case for blur is identical, if not stronger (a user stares at the topbar all day, not just on first landing).
   - Why it hurts: this is developed fully in §17 below, since it's really a Blur/Glassmorphism finding surfacing here from the Navbar angle — flagged in both places because it's significant enough to be found from either direction.
   - New standard: see §17.

---

## 15. Dialogs

**What's working:** `Modal`/`ConfirmDialog` share a clean, consistent structure (backdrop fade-in + card slide-up, a header/body/footer grid, size variants from `sm` to `full`) and a genuinely nice semantic icon-medallion system (`.modal-header__icon--danger/warning/success/info`) that correctly reuses the same soft-color-pairs as Badge and Alert — meaning a user learns "this soft-orange tint means info, this soft-red tint means danger" once and it holds across badges, alerts, and dialogs alike. This cross-component semantic-color consistency is a real strength worth calling out and preserving explicitly for V2.

**Inconsistencies:**

1. **`Drawer`'s documented `size` prop does nothing.**
   - Problem: `Modal.jsx:164-170` maps a `size` prop (`sm`/`md`/`lg`) to Tailwind-style class names, but `.drawer`'s actual CSS (modals.css:155-169) hardcodes `max-width: 28rem` unconditionally — the size prop has no corresponding rule at all.
   - Why it hurts: the exact same "API promises a variant that silently does nothing" failure mode as Card's `elevated` variant (§3 finding 4) — a second instance of the same underlying discipline gap, this time in the Dialogs family.
   - New standard: implement real width rules for each size step (following the existing `.modal-card--sm/lg/xl/full` pattern already correctly implemented for `Modal`, just missing for `Drawer`), or remove the prop.

2. **The elevation rule that explains why Modal is opaque/heavy while Card is translucent/light is never written down.**
   - Problem: `.modal-card` uses opaque `--color-surface-strong` + `--shadow-xl`; `.panel` uses translucent `--color-surface-glass` + `--shadow-md`. The _outcome_ is reasonable (see §9's proposed two-tier rule) but nothing in the codebase currently documents it as a rule — it reads, on first inspection, as one more unexplained inconsistency rather than a deliberate elevation system.
   - Why it hurts: without a written rule, a new component introduced at "modal height" in V2 has a 50/50 chance of guessing glass instead of solid, since nothing currently tells the next contributor which tier a new high-elevation surface belongs to.
   - New standard: the two-tier elevation rule proposed in §9 should be written into this document (done) and into the component library's own inline documentation, not left implicit in the CSS.

---

## 16. Shadows

**What's working:** a genuinely well-graduated shadow scale exists — `--shadow-xs` through `--shadow-xl`, plus purpose-built `--shadow-focus`/`--shadow-focus-danger` for focus rings and a bespoke `--shadow-highlight` for the Pro-plan glow — and critically, it's **theme-aware in the right direction**: dark-theme shadows carry notably higher opacity (e.g. `--shadow-md: 0 12px 28px rgba(0,0,0,0.38)`) than light-theme's (`rgba(15,23,42,0.1)`), which is the correct call — a shadow needs more contrast to read against a dark background. This system should be preserved unchanged into V2.

**Inconsistencies:**

1. **Elevation isn't assigned by a consistent rule across analogous components — see §3 finding 6 (four card treatments) and §3 finding 3 (`.pricing-card`'s duplicate, weaker shadow combination in the dead `layout.css` copy) for the concrete evidence.** Restated here as the Shadows-specific standard:
   > **New standard:** shadow value should be a function of a component's _elevation tier_ (§9's two-tier rule), not chosen per-component by eye. `--shadow-md` for the floating/glass tier, `--shadow-xl` for the solid/heavy tier, `--shadow-elevated` reserved specifically for the _hover_ state of an interactive card transitioning up one level — never as a resting-state shadow (which is where `.lp-feature-card`'s sm→elevated hover jump, noted in §5 finding 2, is actually the _correct_ pattern others should match).

---

## 17. Blur Effects & Glassmorphism

This is the most consequential single finding in the entire document, because CLAUDE.md names "glass-like subtle surfaces" as one of the product's defining visual traits — and the audit found that trait is real in exactly one place.

1. **`--color-surface-glass` (a translucent background token, used in 8+ places: `.panel`, `.stat-card`, `.feature-card`, `.pricing-card`, `.lp-feature-card`, `.auth-page .panel`, `.topbar`) is paired with `backdrop-filter: blur()` in exactly **one** of those places — `.marketing-nav`.**
   - Problem: confirmed via a full-codebase grep for `backdrop-filter` — a single match, `layout.css:768`. Every other surface using the "glass" token is, technically, just a translucent color with no blur — meaning whatever sits behind it (the page's ambient radial-gradient background, or scrolling content, in the topbar's case) shows through **unblurred**, which reads less like frosted glass and more like a slightly-dimmed, slightly-muddied version of whatever's underneath.
   - Why it hurts: this is a direct gap between the stated design philosophy and the shipped implementation. It's most consequential on `.topbar` — the one surface in the authenticated app a user looks at constantly, sticky over scrolling content, using the exact same "glass" token as the marketing nav but without the one property that actually makes glass read as glass. A user would reasonably expect the app's own header to have at least the same polish as the logged-out marketing header; today it has less.
   - New standard for V2: **every surface using `--color-surface-glass` gets `backdrop-filter: blur()` as a paired, non-optional property** — enforce this by folding both into a single reusable utility (e.g. a `.surface-glass` class bundling `background: var(--color-surface-glass); backdrop-filter: blur(var(--blur-glass, 12px)); -webkit-backdrop-filter: blur(var(--blur-glass, 12px));`) rather than letting each component file declare the background alone and "forget" the blur, which is what happened here. (Note: `-webkit-backdrop-filter` is also currently missing from the one working instance — Safari requires the prefixed property for backdrop-filter to apply at all, so `.marketing-nav`'s blur may not even be rendering in Safari today, worth a real-device check before V2 ships the fixed, expanded version.)

2. **Where blur _is_ conceptually present (Brand Studio's locked-content overlay), it's implemented as a filter on the content, not the overlay — a different, valid technique, but worth naming as the second legitimate pattern rather than a contradiction of finding 1.**
   - Note, not a problem: `.brand-studio__locked-inline-content { filter: blur(2.5px) saturate(0.7) }` (brand-studio.css:219) blurs the _locked content itself_ to signal "this is inaccessible," which is a different, and here correct, use of blur (content obfuscation, not surface glassmorphism). Worth documenting as a second, intentional blur pattern for V2 so it isn't confused with — or accidentally "fixed" into — the glass-surface pattern above.

---

## 18. Visual Hierarchy

**What's working:** where the full pattern is used, it's genuinely effective — an accent-colored `.eyebrow` (uppercase overline label) above a heading, above muted supporting text, is a clear, well-judged hierarchy applied consistently across Landing, Pricing, Features, and the legal pages.

**Inconsistencies:**

1. **The eyebrow pattern exists only on the marketing half of the product.**
   - Problem: Landing/Pricing/Features/Terms/Privacy all lead sections with an `.eyebrow`; Dashboard/Invoices/Clients/Settings go straight to a plain `.page-header` title with no eyebrow at all.
   - Why it hurts: the hierarchy convention that tells a user "you are now looking at a section called X" exists in one half of the product and not the other — a user who has internalized "orange label = section context" from the marketing site loses that cue the moment they log in, for no functional reason.
   - New standard: either extend the eyebrow pattern into the app shell (e.g. a small accent-colored label above each page's `h1`, matching the marketing convention) or deliberately declare it a marketing-only device and document why — but not leave it as an unstated split.

2. **The "big number" role — the single most important figure on a card — is set at three different sizes across three contexts that all serve the identical purpose.**
   - Problem: `.stat-card__value` (Dashboard) = `1.75rem`; `.pricing-card__price` / `.pricing-card strong` (Pricing) = `3rem`; `.plan-price__amount` (Subscriptions) = `var(--text-heading-lg)` = `1.5rem`. Three sizes for "the number that matters most on this card."
   - Why it hurts: some of this size difference is defensible (a pricing page's price _should_ be the largest text on the page, arguably larger than a dashboard stat) — but the total absence of a named, shared token for "the emphasized numeral" role means each was set independently by eye rather than by a rule, and the Dashboard/Subscriptions gap (1.75rem vs. 1.5rem) in particular has no obvious functional justification.
   - New standard: name this role explicitly — e.g. `--text-figure-lg` (pricing-scale emphasis) and `--text-figure-md` (dashboard/subscription-scale emphasis) — and have every "this is the important number" instance in the app resolve to one of exactly those two, rather than each card inventing its own value.

---

## 19. V2 Design-Language Checklist

A condensed, actionable summary of every "new standard" above, grouped by what kind of change it is. Nothing here has been implemented — this is the punch list for whoever picks up V2 styling work.

**Token additions needed:**

- `--color-on-accent` (currently referenced, never defined — §4, §10)
- `--text-figure-lg` / `--text-figure-md` for the "emphasized numeral" role (§18)
- `--control-padding-y` / `--control-padding-x`, or a `--space-2-5` half-step (§2)
- `--blur-glass` (default `12px`) to pair with every `--color-surface-glass` usage (§17)
- A named token for `.early-supporter-badge`'s deliberately-non-themed gray (§4)

**Dead/duplicate CSS to resolve before V2 styling begins:**

- `.icon-button`, `.file-upload`, `.form-grid`, `.form-actions`/`.actions`, `.pricing-card` — each defined in both `layout.css` and a `components/*.css` file; delete the shadowed `layout.css` copies (§3)
- `Card`'s `variant="elevated"` — implement or remove (§3, §9)
- `CardBody`/`CardFooter` — implement and adopt, or remove (§3)
- `Drawer`'s `size` prop — implement real width rules or remove (§15)

**Component-family rules to formalize (currently implicit or inconsistently applied):**

- Two-tier elevation system: floating/glass (`.panel`) vs. solid/heavy (`.modal-card`) — every card-like surface, marketing or app, picks one (§9, §15, §16)
- `EmberSelect` as the sole select pattern; retire the native `<select>`'s stale chevron (§8)
- One hover-lift distance shared across all interactive cards (§5)
- Eyebrow hierarchy pattern: extend into the app shell or explicitly scope to marketing only (§18)
- Auth forms' denser radius/spacing: keep as a named, documented exception or unify with the rest of the app (§8)

**Net-new standard to set proactively (no existing debt to clean up):**

- Charts: token-only color, shared elevation tier, shared motion tokens, `--text-mono`/`--text-caption` for labels — defined _before_ the first chart ships, not after (§12)

**Preserve unchanged into V2 (these are working well and should not be "fixed"):**

- The 8px spacing scale's use for gaps/margins (§2)
- The full shadow scale and its theme-aware opacity (§16)
- The button family's variant/size/interaction model (§10)
- The table responsive strategy (horizontal scroll → stacked cards) (§11)
- The loading-state family (`.spinner`/`.ember-spinner`/`.route-progress`/`.brand-loader`) and the no-skeletons rule (§6)
- The Pro-activation and app-entrance signature-moment animations (§5)
- The sidebar's centralized token block and its deliberate always-dark treatment in both themes (§13)
- Single-accent-color discipline and semantic-only status color usage (§4)
- The document-studio rendering surface's deliberate token boundary — `document.css` (the actual invoice/proposal paper output) correctly uses its own fixed warm-paper palette rather than the app's dark-mode tokens, since a professional PDF should never look "dark mode." This is a correct, intentional exception, not an inconsistency — worth stating explicitly so a future contributor doesn't "fix" it by mistake.
