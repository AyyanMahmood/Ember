# Ember Design Bible

**Version:** 1.0  
**Status:** Canonical design authority  
**Last Updated:** 2026-07-18

---

## 1. Brand Identity

**Mission:** A freelance-first finance workspace that feels calm, trustworthy, and fast.

**Personality:** Warm precision. Professional without stiffness. Minimal without coldness.

**Wordmark:** "Ember" in Inter 900, tracking -0.02em. Glyph (abstract flame, 1:1) left of wordmark at 1.2× cap height. Never used separately < 24px.

**Voice:** Direct, confident, human. "Your invoice was paid" not "Payment received successfully." No exclamation marks in product UI.

**Rationale:** Freelancers manage money under stress. The brand must signal stability, not excitement.

---

## 2. Visual Philosophy

| Pillar | Expression | Rationale |
|--------|------------|-----------|
| Warmth | Cream base (`#F7F1E3`), amber shadows, 8px radius | Reduces cognitive load during financial tasks; approachable not clinical |
| Premium | 7:1 body contrast, refined type scale, meaningful motion | Signals reliability for financial data; justifies Pro pricing |
| Minimal | No decorative gradients, no gratuitous illustrations, purposeful whitespace | Freelancers need focus, not distraction; every pixel earns its keep |
| Fast | CSS custom properties only, zero runtime theming, `prefers-reduced-motion` respected | Perceived performance builds trust; no layout shift on theme toggle |

**Elevation model:**

```
Page (--bg) → Surface (--surface) → Card (--surface, shadow-md)
                                    → Modal (--surface-strong, shadow-xl)
```

Rationale: Consistent elevation language lets users intuit hierarchy without learning.

---

## 3. User Experience Principles

1. **Calm by default** — No auto-playing animations, pulse badges, or unread counts unless user opts in. Rationale: Financial work is already high-stress.
2. **Trust through transparency** — Show exact amounts, dates, statuses. Never hide fees or rounding. Rationale: Freelancers lose money to opacity.
3. **Fast over clever** — Keyboard shortcuts > drag-and-drop. Inline edit > modal edit. Rationale: Power users optimize for speed; novices discover naturally.
4. **Freelance-first defaults** — Single currency, simple tax, monthly limits visible. Pro features progressive, not hidden. Rationale: Free tier must be genuinely useful.
5. **No guesswork** — Empty states explain *why* and *what next*. Errors suggest fixes. Rationale: Solo founders have no support team.

---

## 4. Products We Admire

| Product | Lessons Adopted | Anti-Patterns Rejected |
|---------|-----------------|------------------------|
| **Paddle** | Clean billing UI, clear plan comparison, hosted checkout | Overuse of illustration, marketing-heavy dashboard |
| **Notion** | Calm palette, slash commands, block composition | Nested menus, inconsistent density, slow initial load |
| **Linear** | Opinionated defaults, keyboard-first, velocity-focused | Rigid workflows, no customization, dark-mode only |
| **Vercel** | Technical clarity, deployment preview, minimal chrome | Dense documentation, developer-only metaphors |
| **Raycast** | Command palette as primary nav, instant search, extensibility | Mac-only, requires memorization, no mouse fallback |
| **Arc Browser** | Spatial thinking, fluid animations, profile switching | Platform lock-in, high learning curve, battery drain |

**Synthesis:** Steal calm + keyboard speed + technical clarity. Reject illustration-heavy, platform-locked, memorization-dependent patterns.

---

## 5. Color System

**Semantic tokens (source: `tokens.css`):**

```
--color-ink            #0A0A0A   Primary text, headings
--color-muted          #6D675D   Secondary text, labels, timestamps
--color-bg             #F7F1E3   Page background only
--color-surface        #FFFAF2   Cards, panels, sidebar (82% opacity)
--color-surface-strong #FFFFFF   Modals, dropdowns, toasts
--color-line           #E5DCCD   Borders, dividers, table rules
--color-blue           #3B82F6   Primary actions, links, active nav
--color-blue-dark      #2563EB   Hover/active primary
--color-blue-soft      #DBEAFE   Primary badges, chips, hover bg
--color-blue-strong    #1E40AF   Text on primary backgrounds
--color-success        #067647   Paid, confirmed, positive trends
--color-success-soft   #DCFCE7   Success badges
--color-warning        #B54708   Pending, attention, overdue warnings
--color-warning-soft   #FEF3C7   Warning badges
--color-danger         #B42318   Destructive, overdue, errors
--color-danger-soft    #FEE2E2   Danger badges
--color-draft          #4F4639   Draft status, neutral actions
--color-draft-soft     #EEE7DC   Draft badges
```

**Usage matrix:**

| Token | Use For | Never Use For |
|-------|---------|---------------|
| `--color-ink` | Body text, headings | Disabled states, decorative |
| `--color-muted` | Labels, hints, timestamps | Primary actions, links |
| `--color-bg` | Page root only | Cards, modals, any elevated surface |
| `--color-surface` | Cards, sidebar, topbar | Page background |
| `--color-surface-strong` | Modals, dropdowns, toasts | Large content areas |
| `--color-blue` | Primary buttons, active nav, links | Non-interactive elements |
| `--color-success/--warning/--danger` | Status badges, inline alerts | Decorative accents |

**Dark mode:** Tokens defined in `@media (prefers-color-scheme: dark)`. No UI toggle in v1.0. Rationale: Avoids flash-of-wrong-theme; ship toggle in v1.1 with persistence.

**Contrast minimums:** Body 7:1, Large text 4.5:1, UI components 3:1, Focus indicators 3:1. All verified WCAG 2.1 AA.

---

## 6. Typography

**Font stacks:**

```
--font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
--font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace
```

**Type scale (clamp-based responsive):**

| Token | Size | Line Ht | Weight | Use Case |
|-------|------|---------|--------|----------|
| `--text-display-xl` | clamp(3.75rem, 10vw, 8.6rem) | 0.85 | 900 | Landing hero only |
| `--text-display-lg` | clamp(2.5rem, 5vw, 4rem) | 1.0 | 800 | Section headlines |
| `--text-display-md` | clamp(2rem, 4vw, 3.2rem) | 1.05 | 800 | Page titles |
| `--text-heading-xl` | clamp(1.65rem, 3vw, 2.45rem) | 1.15 | 800 | Card titles, modal headers |
| `--text-heading-lg` | 1.5rem | 1.2 | 700 | Section headers |
| `--text-heading-md` | 1.25rem | 1.3 | 700 | Subsections |
| `--text-heading-sm` | 1.125rem | 1.35 | 700 | Panel headers |
| `--text-body-lg` | 1.125rem | 1.65 | 400 | Lead paragraphs |
| `--text-body` | 1rem | 1.6 | 400 | Default body |
| `--text-body-sm` | 0.875rem | 1.55 | 400 | Descriptions, help text |
| `--text-label` | 0.875rem | 1.5 | 700 | Form labels |
| `--text-caption` | 0.75rem | 1.5 | 600 | Timestamps, hints |
| `--text-overline` | 0.7rem | 1.4 | 900 | Category labels (uppercase) |
| `--text-mono` | 0.875rem | 1.5 | 500 | Currency, IDs, code |

**Hierarchy rules:**
- One `display` or `heading-xl` per view
- `heading-lg` for major sections
- `heading-md`/`heading-sm` for card/panel headers
- Body text never smaller than `--text-body-sm` (14px)
- Monospace for all currency, invoice numbers, dates

Rationale: Consistent scale prevents visual noise; clamp ensures readability across viewports without breakpoint juggling.

---

## 7. Spacing & Grid

**Base unit:** 4px (`--space-1`)

**Scale:**

| Token | Value | Rem | Use Case |
|-------|-------|-----|----------|
| `--space-1` | 4px | 0.25rem | Icon+text gaps, tight inline |
| `--space-2` | 8px | 0.5rem | Chip gaps, button icon spacing |
| `--space-3` | 12px | 0.75rem | Component internal padding |
| `--space-4` | 16px | 1rem | Standard gap, card padding |
| `--space-5` | 20px | 1.25rem | Form field vertical gap |
| `--space-6` | 24px | 1.5rem | Section gaps, panel padding |
| `--space-8` | 32px | 2rem | Large section gaps |
| `--space-10` | 40px | 2.5rem | Major section gaps |
| `--space-12` | 48px | 3rem | Page-level vertical rhythm |
| `--space-16` | 64px | 4rem | Hero sections |

**Max-width containers:**

| Token | Value | Use Case |
|-------|-------|----------|
| `--max-content` | 1180px | Marketing, dashboard content |
| `--max-narrow` | 820px | Forms, settings, detail pages |
| `--max-form` | 640px | Auth cards, modals |
| `--max-prose` | 672px (42rem) | Reading text blocks |

**Grid:** 12-column, `--space-6` (24px) gutters, fluid columns `minmax(0, 1fr)`.

**Breakpoints:**

| Token | Value | Layout Change |
|-------|-------|---------------|
| `--bp-sm` | 480px | Mobile landscape |
| `--bp-md` | 680px | Tablet portrait |
| `--bp-lg` | 920px | **Sidebar → drawer**, grids → 1col |
| `--bp-xl` | 1200px | Desktop |
| `--bp-2xl` | 1440px | Large desktop |

Rationale: 4px base aligns to 8px rhythm; 12-col grid supports 2/3/4/6 column layouts; 920px breakpoint matches sidebar collapse.

---

## 8. Component Specifications

### 8.1 Buttons

**Variants:**

| Variant | Background | Border | Text | Hover | Focus Ring |
|---------|------------|--------|------|-------|------------|
| `primary` | `--color-blue` | none | white | `--color-blue-dark` | `--color-blue` |
| `secondary` | `--color-surface` | `--color-line` | `--color-ink` | `--color-bg` | `--color-blue` |
| `ghost` | transparent | none | `--color-ink` | `--color-bg` | `--color-blue` |
| `danger` | `--color-danger-soft` | `--color-danger` | `--color-danger` | `--color-danger-strong` | `--color-danger` |
| `success` | `--color-success-soft` | `--color-success` | `--color-success` | `--color-success-strong` | `--color-success` |
| `warning` | `--color-warning-soft` | `--color-warning` | `--color-warning` | `--color-warning-strong` | `--color-warning` |

**Sizes:**

| Size | Height | Padding (x/y) | Font Size | Icon Size |
|------|--------|---------------|-----------|-----------|
| `sm` | 32px | 10px / 10px | 0.82rem | 15px |
| `md` | 40px | 16px / 10px | 1rem | 18px |
| `lg` | 48px | 20px / 13px | 1.125rem | 20px |

**States:** `hover` (translateY -1px), `active` (translateY 0), `focus-visible` (3px ring), `disabled` (opacity 0.55, no transform). Transitions `--duration-fast` `--ease-out`.

**Icon buttons:** 40×40px (md), 32×32px (sm), radius `--radius-md`, background `--color-surface`, border `--color-line`.

Rationale: 6 variants cover all semantic actions; 3 sizes match touch targets (44px min); lift on hover signals interactivity without color shift.

---

### 8.2 Inputs & Form Controls

**Base:** Full width, 1px `--color-line` border, `--radius-md`, background `#FFFDf8` (warmer than surface), `--text-body` size, `--duration-fast` transitions.

**Focus:** Border `--color-blue` at 65% opacity, ring `--shadow-focus` (3px `--color-blue` at 12%).

**Variants:** `default` (text), `textarea` (min-height 100px, resize vertical), `select` (native, custom arrow future), `file` (inline-flex, min-height 45px, centered).

**Label:** `--text-label` (14px, 700, `--color-muted`), gap `--space-2` (7px) to input.

**Validation:** `error` → border `--color-danger`, focus ring `--color-danger` at 12%; `success` → border `--color-success`.

**Addons:** Prefix/suffix slots share container border-radius; internal borders use `--color-line`.

Rationale: Warm input background reduces clinical feel; 3px focus ring meets AA; label weight 700 ensures hierarchy over placeholder.

---

### 8.3 Cards

**Variants:**

| Variant | Padding | Shadow | Border | Background | Use Case |
|---------|---------|--------|--------|------------|----------|
| `default` | `--space-4` | `--shadow-md` | `--color-line` | `--color-surface` (82%) | Default content container |
| `strong` | `--space-4` | `--shadow-md` | `--color-line` | `--color-surface-strong` | High-contrast needs |
| `elevated` | `--space-4` | `--shadow-lg` | `--color-line` | `--color-surface` | Hoverable, interactive |
| `interactive` | `--space-4` | `--shadow-md` | `--color-line` | `--color-surface` | Clickable cards (hover: `--color-bg`) |
| `none` | 0 | none | none | transparent | Composed layouts |

**Structure:** `CardHeader` (title + subtitle + action), `CardBody`, `CardFooter` — all optional.

**StatCard:** Specialized — label (`--text-caption`), value (`--text-heading-xl` mono), note (`--text-body-sm`), optional trend (▲/▼ + label).

**FeatureCard:** Marketing — icon (24px), title (`--text-heading-sm`), description (`--text-body-sm`).

**PricingCard:** Header (name + price/period), features list (checkmarks), CTA. Highlight variant: `--shadow-lg`, border `--color-blue`.

Rationale: 5 variants cover all current uses; `interactive` replaces ad-hoc hover styles; `StatCard` enforces metric density.

---

### 8.4 Tables

**Base:** `border-collapse: collapse`, `min-width: 720px`, horizontal overflow wrapper.

**Cells:** `--space-3` vertical/horizontal padding. `th`: `--text-caption` (12px), 700, uppercase, 0.03em tracking, `--color-muted`. `td`: 15px equivalent.

**Row hover:** `rgba(246, 241, 232, 0.5)` (50% `--color-bg`).

**Alignment:** `right` for currency/numbers/actions, `center` for status/checkboxes.

**Column definition:** `{ key, label, align?, width?, sortable?, render? }`

**Responsibility split (canonical):**
- `Table` — core rendering, sorting, selection, row click
- `TablePagination` — page controls, page size selector
- `TableSkeleton` — loading rows
- `EmptyState` — empty table (composed externally)

Rationale: Single 400-line component violates SRP; splitting enables reuse and testing.

---

### 8.5 Badges

**StatusBadge variants (semantic mapping):**

| Status | Variant | Background | Text |
|--------|---------|------------|------|
| `draft` | `draft` | `--color-draft-soft` | `--color-draft` |
| `sent` | `blue` | `--color-blue-soft` | `--color-blue-strong` |
| `paid` | `success` | `--color-success-soft` | `--color-success-strong` |
| `overdue` | `danger` | `--color-danger-soft` | `--color-danger-strong` |
| `pending` | `warning` | `--color-warning-soft` | `--color-warning-strong` |

**Chip:** Removable, variants: `default`, `success`, `warning`, `danger`, `draft`, `muted`. Remove button 12×12px, accessible label.

**Base badge:** `--radius-full`, `--text-caption` (12px), 900 weight, capitalize, min-width 76px, padding 5.6px/10.4px.

Rationale: Semantic mapping prevents inconsistent status colors; chip removal pattern standardized.

---

### 8.6 Avatars

**Sizes:**

| Size | Dimensions | Font Size |
|------|------------|-----------|
| `xs` | 24×24px | 0.625rem |
| `sm` | 32×32px | 0.75rem |
| `md` | 38×38px | 0.8rem |
| `lg` | 64×64px | 1.15rem |
| `xl` | 80×80px | 1.5rem |
| `2xl` | 128×128px | 2.5rem |

**Fallback:** Initials (max 2, uppercase, 900 weight) on `--color-line` background (`#E7DDCB`). Image load error → fallback.

**AvatarGroup:** Overlap 8px (configurable), max 5 visible, `+N` indicator same size.

**LogoPlaceholder:** 128×77px, `--radius-md`, border `--color-line`, bg `#F2EADC`, text "Logo" 900 weight `--color-muted`.

**Canonical rule:** Single `useInitials` hook used by `Avatar` only. No duplicate logic.

---

### 8.7 Modals & Drawers

**Backdrop:** `rgba(10, 10, 10, 0.38)`, `fade-in` `--duration-base` `--ease-out`.

**Modal card:** `--color-surface-strong`, border `--color-line`, `--radius-md`, `--shadow-xl`, max-width 760px, padding `--space-4`.

**Animations:** `slide-up` (translateY 8px → 0) `--duration-base` `--ease-in-out` + `fade-in`.

**Drawer:** Side sheet (right default), widths: `sm` 320px, `md` 480px, `lg` 640px, `xl` 800px, `full` 100%. Same backdrop, `slide-in` from side.

**Focus trap:** Required. Restore focus on close. `Escape` closes.

**Header:** Title (`--text-heading-sm`), close button (icon-button `sm`).

Rationale: Shared animation tokens ensure consistency; focus trap non-negotiable for accessibility.

---

### 8.8 Empty States

**Structure:** Icon (48px) → Title (`--text-heading-sm`) → Message (`--text-body`, `--color-muted`) → Action (Button).

**Variants:** `default`, `success` (green icon), `warning` (amber), `danger` (red).

**Illustrations (SVG, stroke 1.5):** `default` (document), `inbox`, `users`, `document`, `chart`, `search`, `lock`, `notification`.

**Min height:** 240px (15rem), centered vertically in card.

Rationale: Consistent empty state pattern prevents "no data" confusion; illustrations add warmth without weight.

---

### 8.9 Loading States

**Spinner:** 16px base, border 2px `--color-line`, top border `--color-blue`, 800ms linear spin.

**Sizes:** `xs` 12px, `sm` 16px, `md` 20px, `lg` 24px, `xl` 32px.

**Skeleton variants:** `text`, `textSm`, `textLg`, `heading`, `avatar`, `button`, `card`, `row`, `circle`, `rounded`.

**Animations:** `pulse` (opacity 1.2s ease-in-out), `wave` (background-position), `none`.

**Composed:** `SkeletonCard` (avatar + title + N lines + action), `SkeletonTable` (header + N rows), `SkeletonList`.

Rationale: Skeletons match real content structure; pulse preferred over wave for reduced motion compatibility.

---

## 9. Navigation Philosophy

**Sidebar (desktop ≥920px):** Fixed 260px, `--color-surface` (86% opacity), border-right `--color-line`, sticky top, 100vh.

**Brand row:** ~48px, wordmark `--text-heading-sm` 900 `--color-ink`.

**Nav items:** 15px equivalent, 800 weight, `--color-muted` default, `--color-ink` active/hover, background `--color-bg` on active/hover, `--radius-md`, padding 12px/13px, gap 10px, icon 18px.

**Active state:** Background `--color-bg` + `--color-ink` text. Not border-left.

**Footer:** Avatar (38px) + name/email + logout (ghost full-width).

**Mobile (<920px):** Off-canvas drawer, width `85vw` max `20rem`, transform `translateX(-105%)`, transition `--duration-base` `--ease-out`, shared backdrop with modal.

**Topbar (desktop):** 75px, `--color-bg` (88% opacity), border-bottom `--color-line`, sticky top, z-index 4. Left: eyebrow (`--text-overline`) + H1 (`--text-heading-md`). Right: user menu (future).

**Breadcrumbs:** Not yet implemented. When added: `--text-caption`, `--color-muted`, `/` separator, current page `--color-ink` 700.

Rationale: Fixed sidebar enables muscle memory; 920px breakpoint balances content width; active state uses background not border for warmth.

---

## 10. Dashboard & Invoice Builder Philosophy

**Dashboard:**
- StatCard grid: 4 columns ≥1200px, 2 columns ≥680px, 1 column <680px
- Density: `--space-4` card padding, `--space-6` grid gap
- Recent invoices table: 5 rows default, pagination at 10
- Empty state: Illustration + "Create your first invoice" CTA

**Invoice Builder (progressive disclosure):**
1. **Header** — Client select, invoice number, dates, currency
2. **Line items** — Inline editable table (description, qty, price, tax), add row button, keyboard nav (Tab → next cell, Enter → edit, Escape → cancel)
3. **Totals** — Subtotal, tax, discount, total (right-aligned, mono, `--text-heading-lg`)
4. **Actions** — Save draft (secondary), Send (primary), Preview (ghost)

**Save states:** Auto-save draft every 3s (debounced), toast "Saved" → "Saved just now" → "Saved 2m ago". No modal confirmation.

**PDF export:** Server-rendered template using user branding (logo, accent color, footer). Client-side fallback via jsPDF.

Rationale: Inline editing > modal for line items; auto-save prevents loss; mono totals prevent misreading.

---

## 11. Motion & Animation

**Duration tokens:**

| Token | Value | Use Case |
|-------|-------|----------|
| `--duration-instant` | 0ms | Immediate feedback |
| `--duration-fast` | 120ms | Hover, focus, simple transitions |
| `--duration-base` | 180ms | **Default** — modals, dropdowns, sidebar |
| `--duration-slow` | 280ms | Complex panels, page transitions |
| `--duration-slower` | 400ms | Hero, onboarding |

**Easing tokens:**

| Token | Curve | Use Case |
|-------|-------|----------|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | **Default** — natural deceleration |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Modals, drawers |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful — toasts, badges |

**Principles:**
1. Respect `prefers-reduced-motion` — all animations disabled via global media query
2. Transform over layout — `translate`, `scale`, `opacity` only
3. Stagger children — 40ms delay per item in lists
4. Entrance > exit — enter 180ms, exit 120ms

**Key animations (current):**

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Button hover lift | 120ms | `--ease-out` | hover |
| Button press | 80ms | ease-in | active |
| Focus ring | 120ms | `--ease-out` | focus |
| Modal fade + slide | 180ms | `--ease-in-out` | mount |
| Backdrop fade | 150ms | `--ease-out` | mount |
| Sidebar slide | 180ms | `--ease-out` | mobile toggle |
| Spinner rotate | 800ms | linear | continuous |
| Table row hover | 120ms | `--ease-out` | hover |

Rationale: 4 durations cover all needs; spring reserved for delight moments; transform-only ensures 60fps.

---

## 12. Mobile Behaviour

**Breakpoints:** See Section 7.

**Touch targets:** Minimum 44×44px (iOS HIG). Buttons `md` (40px) + 4px padding = 48px. Icon buttons 40×44px.

**Table fallback:** At `<920px`, tables render as stacked cards:
- Each row → card
- Each cell → label + value (label `--text-caption` `--color-muted`, value `--text-body`)
- Actions → button group at card bottom

**Safe areas:** `padding-bottom: env(safe-area-inset-bottom)` on bottom sheets/drawers.

**Sidebar:** Hamburger in topbar (icon-button `md`), opens drawer.

**Forms:** Single column, `--max-form` width, labels above inputs.

**Modals/Drawers:** Full-width on mobile (`modal-card--full`, `drawer--full`), bottom sheet behavior for drawers.

Rationale: Card fallback preserves data density; 44px targets prevent fat-finger errors; full-width modals avoid horizontal scroll.

---

## 13. Accessibility

**Contrast (WCAG 2.1 AA):**

| Element | Minimum | Target |
|---------|---------|--------|
| Body text | 4.5:1 | 7:1 (`--color-ink` on `--color-bg`) |
| Large text (18px+) | 3:1 | 4.5:1 |
| UI components | 3:1 | 4.5:1 |
| Focus indicators | 3:1 | 4.5:1 |

**Focus management:**
- Visible `focus-visible` ring on **all** interactive elements (`--shadow-focus`)
- Focus trap in modals/drawers
- Restore focus on close
- Skip link: "Skip to main content" (first tab stop)

**Semantic HTML:**
- `<button>` for actions, `<a>` for navigation
- `<label>` + `<input>` associations (explicit `for`/`id`)
- `<table>` with `<thead>`/`<tbody>`/`<th scope="col">`
- ARIA labels on icon-only buttons
- Live regions (`aria-live="polite"`) for toasts, loading states

**Reduced motion:** Global media query disables all non-essential animation (see `tokens.css`).

Rationale: AA is baseline for financial software; focus visibility prevents keyboard traps; semantic HTML costs nothing.

---

## 14. Things Ember Must Never Become

| Anti-Pattern | Why It's Rejected |
|--------------|-------------------|
| **Feature bloat** — Settings for every edge case | Freelancers need opinions, not configuration; complexity kills speed |
| **Excessive animations** — Parallax, springy modals, stagger everything | Motion has a budget; financial tools prioritize clarity over delight |
| **Clutter** — Dense toolbars, multi-row tabs, floating action buttons | Every UI element competes with invoice amounts; whitespace is functional |
| **Unnecessary gradients** — Mesh gradients, animated backgrounds, glassmorphism | Gradients reduce text legibility; cream base + soft shadows = depth without distraction |
| **Inconsistent spacing** — Eyeballed gaps, magic numbers, component-specific scales | 4px base scale exists; deviations create visual noise |
| **Enterprise complexity** — RBAC, audit logs, workflow builders, SSO | Ember serves solo freelancers and micro-agencies; Pro tier caps at 5 seats future |
| **Marketing in product** — Upsell banners, feature tours, confetti on paid | Paying users already trust the product; free users see pricing page |
| **Dark patterns** — Auto-renew obscurity, hidden export, data lock-in | Freelancers protect their own data; trust is the only moat |

**Enforcement:** Any PR introducing these patterns requires design review + documented exception.

---

## 15. Design Review Checklist

Every UI PR must pass:

1. [ ] **Tokens only** — No hardcoded colors, spacing, radii, shadows, durations, easings
2. [ ] **Semantic naming** — Uses `--color-primary` not `--color-blue`; `--color-destructive` not `--color-danger`
3. [ ] **Component reuse** — Composes from Button, Input, Card, Table, Modal, Badge, Avatar, EmptyState, Loading
4. [ ] **No duplicate functionality** — Checks existing components before adding new
5. [ ] **Focus visible** — All interactive elements have `--shadow-focus` ring
6. [ ] **Reduced motion respected** — Animations use duration/ease tokens
7. [ ] **Contrast AA** — Text 4.5:1, UI 3:1, verified
8. [ ] **Touch targets 44px** — Buttons, links, inputs, tappable areas
9. [ ] **Responsive at 920px** — Sidebar→drawer, grids→1col, tables→cards
10. [ ] **Empty/loading/error states** — All data-dependent UI handles all three
11. [ ] **Semantic HTML** — Buttons/links correct, labels associated, tables structured
12. [ ] **ARIA labels** — Icon-only controls labeled, live regions for dynamic content
13. [ ] **Naming consistency** — Follows `panel`→`Card`, `button`→`Button` canonical mapping
14. [ ] **No new CSS without token audit** — New values added to `tokens.css` first
15. [ ] **Documentation updated** — This bible amended if new patterns established

---

## 16. AI Implementation Rules

1. **Never hardcode colors** — Reference `tokens.css` custom properties exclusively
2. **Never hardcode spacing** — Use `--space-*` tokens
3. **Never invent typography** — Use `--text-*` and `--font-*` tokens
4. **Never invent shadows** — Use `--shadow-*` tokens
5. **Never invent border radius** — Use `--radius-*` tokens
6. **Never invent animations** — Use `--duration-*` and `--ease-*` tokens
7. **Always reuse existing components** — Button, Input, Card, Table, Modal, Badge, Avatar, EmptyState, Loading
8. **Never duplicate functionality** — Check `components/ui/` before creating
9. **Tokens first** — New design values added to `tokens.css` before component use
10. **Accessibility by default** — `focus-visible`, ARIA, semantic HTML required
11. **Respect reduced motion** — All animations tokenized, global media query honored
12. **Simplicity over novelty** — Standard patterns preferred over custom solutions

---

## 17. Migration Status Appendix

| Screen | Status | Components Migrated | Notes |
|--------|--------|---------------------|-------|
| DashboardPage | ✅ Complete | StatCard, Table, Card, LoadingSpinner, EmptyState | |
| InvoicesPage | ✅ Complete | Table, Button, StatusBadge, Card, LoadingSpinner | |
| ClientsPage | ✅ Complete | Table, Input, Select, Card, Button, EmptyState | |
| AnalyticsPage | ✅ Complete | StatCard, Card, LoadingSpinner | |
| SettingsPage | ✅ Complete | Forms, branding, billing, usage — all canonical | |
| InvoiceFormPage | ✅ Complete | Line items editor fully migrated | |
| InvoiceDetailPage | ✅ Complete | Read-only detail, PDF actions | |
| ClientFormPage | ✅ Complete | Create/edit client | |
| ClientDetailPage | ✅ Complete | Client detail + related invoices | |
| ProposalsPage | ✅ Complete | Proposal list | |
| ProposalFormPage | ✅ Complete | Proposal editor | |
| LandingPage | ✅ Complete | Marketing hero, features, testimonials | |
| PricingPage | ✅ Complete | Comparison cards, checkout CTAs | |
| FeaturesPage | ✅ Complete | Feature detail grid | |
| AuthPage | ✅ Complete | Login/signup forms | |
| ForgotPasswordPage | ✅ Complete | Auth form | |
| ResetPasswordPage | ✅ Complete | Auth form | |
| Legal Pages (4) | ✅ Complete | Static content | |

**Legend:** ✅ Complete — fully migrated to design system

---

## 18. Future Evolution (Intentionally Postponed)

| Feature | Target | Reason |
|---------|--------|--------|
| Dark mode UI toggle | v1.1 | Tokens ready; persistence + flash prevention needed |
| Toast notification system | v1.1 | Required for save confirmations, errors, async actions |
| Tooltip/Popover components | v1.1 | Needed for truncated text, icon-only buttons, help text |
| Chart library integration (Recharts) | v1.1 | Analytics currently static; charts need theming |
| Keyboard shortcuts (Cmd+K palette) | v1.2 | Power-user feature; requires command registry |
| Print stylesheets | v1.2 | Invoice PDF is primary; print CSS for web view |
| Animation polish (stagger, page transitions) | v1.2 | Current tokens sufficient; choreography needed |
| Focus-visible audit | v1.1 | Automate via CI; manual audit incomplete |

---

## Final Principle

If two rules conflict, **simplicity, clarity, and consistency always take precedence over visual novelty**.

---

*End of Document*