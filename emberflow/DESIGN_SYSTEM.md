# Ember Design System Specification

**Version:** 1.0  
**Status:** Draft — awaiting approval  
**Inspiration:** Paddle (clean SaaS), Notion (calm utility), Material 3 Expressive (modern motion/color)  
**Core Identity:** Warm, premium, freelance-first finance workspace

---

## 1. Color System

### 1.1 Core Palette (CSS Custom Properties)

```css
:root {
  /* Base */
  --ink: #0A0A0A;              /* Near-black, primary text */
  --muted: #6D675D;            /* Warm gray, secondary text */
  --bg: #F7F1E3;               /* Warm cream, page background */
  --surface: #FFFAF2;          /* Elevated surface (cards, modals) */
  --surface-strong: #FFFFFF;   /* Pure white, highest elevation */

  /* Lines & Dividers */
  --line: #E5DCCD;             /* Subtle warm divider */

  /* Brand (Blue) */
  --blue: #3B82F6;             /* Primary action, links */
  --blue-dark: #2563EB;        /* Hover/active state */
  --blue-soft: #DBEAFE;        /* Light fill (badges, chips) */
  --blue-strong: #1E40AF;      /* Text on blue backgrounds */

  /* Semantic */
  --success: #067647;          /* Paid, confirmed */
  --success-soft: #DCFCE7;
  --success-strong: #166534;

  --warning: #B54708;          /* Pending, attention */
  --warning-soft: #FEF3C7;
  --warning-strong: #92400E;

  --danger: #B42318;           /* Destructive, overdue */
  --danger-soft: #FEE2E2;
  --danger-strong: #991B1B;

  /* Draft/Neutral */
  --draft: #4F4639;
  --draft-soft: #EEE7DC;
}
```

### 1.2 Dark Mode (Future)

```css
@media (prefers-color-scheme: dark) {
  :root {
    --ink: #F5F0E8;
    --muted: #A89F91;
    --bg: #141210;
    --surface: #1A1714;
    --surface-strong: #201D19;
    --line: #3D3730;
    --blue: #60A5FA;
    --blue-dark: #93C5FD;
    --blue-soft: #1E3A5F;
    --blue-strong: #DBEAFE;
    /* Semantic adjust similarly */
  }
}
```

### 1.3 Usage Rules

| Token | Use For | Not For |
|-------|---------|---------|
| `--ink` | Primary headings, body text | Disabled states |
| `--muted` | Secondary labels, hints, timestamps | Primary actions |
| `--bg` | Page background only | Cards, modals |
| `--surface` | Cards, panels, sidebars | Page background |
| `--surface-strong` | Modals, dropdowns, toasts | Large areas needing max contrast |
| `--blue` | Primary buttons, active nav, links | Non-interactive elements |
| `--blue-soft` | Chips, badges, hover backgrounds | Text |
| `--success/--warning/--danger` | Status badges, inline alerts | Decorative accents |

---

## 2. Typography

### 2.1 Font Stack

```css
--font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

### 2.2 Type Scale

| Name | Size | Line Height | Weight | Use Case |
|------|------|-------------|--------|----------|
| `display-xl` | clamp(4rem, 12vw, 9rem) | 0.85 | 900 | Hero headlines (landing) |
| `display-lg` | clamp(2.5rem, 5vw, 4rem) | 1.0 | 800 | Section headlines |
| `display-md` | clamp(2rem, 4vw, 3rem) | 1.05 | 800 | Page titles |
| `heading-xl` | 1.875rem / 30px | 1.15 | 800 | Card titles, modal headers |
| `heading-lg` | 1.5rem / 24px | 1.2 | 700 | Section headers |
| `heading-md` | 1.25rem / 20px | 1.3 | 700 | Subsections |
| `heading-sm` | 1.125rem / 18px | 1.35 | 700 | Panel headers |
| `body-lg` | 1.125rem / 18px | 1.65 | 400 | Lead paragraphs |
| `body` | 1rem / 16px | 1.6 | 400 | Default body text |
| `body-sm` | 0.875rem / 14px | 1.55 | 400 | Secondary text, descriptions |
| `label` | 0.875rem / 14px | 1.5 | 700 | Form labels |
| `caption` | 0.75rem / 12px | 1.5 | 600 | Timestamps, hints |
| `overline` | 0.7rem / 11px | 1.4 | 900 | Eyebrow/category labels (uppercase) |
| `mono` | 0.875rem / 14px | 1.5 | 500 | Currency, IDs, code |

### 2.3 Responsive Clamp Reference

```css
--text-display-xl: clamp(3.75rem, 10vw, 8.6rem);  /* 60px–138px */
--text-display-lg: clamp(2.5rem, 5vw, 4rem);      /* 40px–64px */
--text-display-md: clamp(2rem, 4vw, 3.2rem);      /* 32px–51px */
--text-heading-xl: clamp(1.65rem, 3vw, 2.45rem);  /* 26px–39px */
```

---

## 3. Spacing System

### 3.1 Base Unit: 4px (0.25rem)

### 3.2 Scale

| Token | Value | Rem | Use Case |
|-------|-------|-----|----------|
| `space-1` | 4px | 0.25rem | Tight gaps (icon + text) |
| `space-2` | 8px | 0.5rem | Small gaps (chips, inline) |
| `space-3` | 12px | 0.75rem | Component internal padding |
| `space-4` | 16px | 1rem | Standard gap, card padding |
| `space-5` | 20px | 1.25rem | Form field gaps |
| `space-6` | 24px | 1.5rem | Section gaps, panel padding |
| `space-8` | 32px | 2rem | Large section gaps |
| `space-10` | 40px | 2.5rem | Major section gaps |
| `space-12` | 48px | 3rem | Page-level vertical rhythm |
| `space-16` | 64px | 4rem | Hero sections |

### 3.3 Layout Max-Widths

| Token | Value | Use Case |
|-------|-------|----------|
| `max-content` | 1180px | Marketing sections, dashboard content |
| `max-narrow` | 820px | Forms, settings, detail pages |
| `max-form` | 640px | Auth cards, modals |
| `max-prose` | 42rem (672px) | Reading text blocks |

---

## 4. Border Radius

| Token | Value | Use Case |
|-------|-------|----------|
| `radius-none` | 0 | Tables, full-bleed |
| `radius-sm` | 4px | Chips, badges, small inputs |
| `radius-md` | 8px | **Default** — buttons, inputs, cards, modals, tables |
| `radius-lg` | 12px | Larger cards, preview windows |
| `radius-xl` | 16px | Hero product shots, major surfaces |
| `radius-full` | 9999px | Pills, avatars, progress rings |

**Current codebase uses `8px` universally — retain as `radius-md` default.**

---

## 5. Shadows & Elevation

### 5.1 Shadow Scale

```css
--shadow-xs: 0 1px 2px rgba(40, 32, 22, 0.04);      /* Subtle separators */
--shadow-sm: 0 4px 12px rgba(40, 32, 22, 0.06);      /* Cards, panels */
--shadow-md: 0 12px 28px rgba(40, 32, 22, 0.08);     /* **Default** — cards, sidebar */
--shadow-lg: 0 20px 48px rgba(40, 32, 22, 0.10);     /* Modals, dropdowns */
--shadow-xl: 0 30px 90px rgba(10, 10, 10, 0.24);     /* **Modal backdrop** */
--shadow-focus: 0 0 0 3px rgba(37, 99, 235, 0.12);   /* Focus rings */
```

### 5.2 Elevation Mapping

| Elevation | Shadow | Background | Example |
|-----------|--------|------------|---------|
| 0 (page) | none | `--bg` | Page root |
| 1 (surface) | `--shadow-sm` | `--surface` | Sidebar, topbar |
| 2 (card) | `--shadow-md` | `--surface` | Stat cards, panels |
| 3 (floating) | `--shadow-lg` | `--surface-strong` | Dropdowns, toasts |
| 4 (modal) | `--shadow-xl` | `--surface-strong` | Modal dialog |

---

## 6. Buttons

### 6.1 Variants

| Variant | Background | Border | Text | Hover | Focus Ring |
|---------|------------|--------|------|-------|------------|
| `primary` | `--blue` | transparent | white | `--blue-dark` | `--blue` |
| `secondary` | `--surface` | `--line` | `--ink` | `--bg` | `--blue` |
| `ghost` | transparent | transparent | `--ink` | `--bg` | `--blue` |
| `danger` | `--danger-soft` | `--danger` | `--danger` | `--danger-strong` | `--danger` |
| `success` | `--success-soft` | `--success` | `--success` | `--success-strong` | `--success` |

### 6.2 Sizes

| Size | Height | Padding (x/y) | Font Size | Icon Size |
|------|--------|---------------|-----------|-----------|
| `sm` | 32px (2rem) | 10px / 10px | 0.82rem | 15px |
| `md` | 40px (2.5rem) | 16px / 10px | 1rem | 18px |
| `lg` | 48px (3rem) | 20px / 13px | 1.125rem | 20px |

### 6.3 States

```css
.button {
  transition: background 0.16s ease, border-color 0.16s ease, transform 0.12s ease, box-shadow 0.12s ease;
}

.button:hover { transform: translateY(-1px); }
.button:active { transform: translateY(0); }
.button:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.button:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
```

### 6.4 Icon Buttons

- Size: 40×40px (md), 32×32px (sm)
- Radius: `radius-md` (8px)
- Background: `--surface` / `--surface-strong`
- Border: `--line`

---

## 7. Inputs & Form Controls

### 7.1 Base Styles

```css
.input {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: #FFFDf8;           /* Slightly warmer than surface */
  color: var(--ink);
  padding: 0.78rem 0.85rem;      /* 12.5px / 13.6px */
  font-size: 1rem;
  line-height: 1.5;
  transition: border-color 0.12s ease, box-shadow 0.12s ease;
}

.input:focus {
  border-color: rgba(37, 99, 235, 0.65);
  box-shadow: var(--shadow-focus);
  outline: none;
}

.input::placeholder { color: var(--muted); opacity: 0.7; }
.input:disabled { background: var(--bg); opacity: 0.6; }
```

### 7.2 Label

```css
.label {
  display: grid;
  gap: 0.45rem;          /* 7px */
  font-size: 0.875rem;   /* 14px */
  font-weight: 700;
  color: var(--muted);
}
```

### 7.3 Variants

| Variant | Description |
|---------|-------------|
| `default` | Standard text input |
| `textarea` | Min-height 100px, resize vertical |
| `select` | Native select with custom arrow (future) |
| `file` | `.file-upload` — inline-flex, centered, min-height 45px |

### 7.4 Input with Addons (Future)

- Prefix/suffix slots for currency, icons
- Unified border radius on container

### 7.5 Validation States

```css
.input.error { border-color: var(--danger); }
.input.error:focus { box-shadow: 0 0 0 3px rgba(180, 35, 24, 0.12); }
.input.success { border-color: var(--success); }
```

---

## 8. Cards & Panels

### 8.1 Panel (Base Card)

```css
.panel {
  background: rgba(255, 250, 242, 0.82);   /* --surface with opacity */
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: 1rem;                              /* space-4 */
}
```

### 8.2 Card Variants

| Variant | Padding | Shadow | Border | Use Case |
|---------|---------|--------|--------|----------|
| `panel` | 1rem | `shadow-md` | `--line` | Default content container |
| `panel-strong` | 1rem | `shadow-md` | `--line` | White background (`--surface-strong`) |
| `stat-card` | 1rem | `shadow-md` | `--line` | Dashboard metrics |
| `feature-card` | 1.25rem | `shadow-md` | `--line` | Marketing feature grid |
| `pricing-card` | 1.3rem | `shadow-md` / `shadow-lg` (highlight) | `--line` / `--blue` (highlight) | Pricing page |
| `preview-card` | 1rem | `shadow-lg` | dark border | Hero product shot |

### 8.3 Card Header Pattern

```css
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel-header h3 { margin: 0; font-size: 1.125rem; font-weight: 700; }
```

---

## 9. Tables

### 9.1 Base Table

```css
.table-wrap { overflow-x: auto; }

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

th, td {
  border-bottom: 1px solid var(--line);
  padding: 0.88rem 0.75rem;   /* 14px / 12px */
  text-align: left;
  vertical-align: middle;
}

th {
  color: var(--muted);
  font-size: 0.77rem;         /* 12px */
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

td { font-size: 0.9375rem; }  /* 15px */

tr:last-child td { border-bottom: none; }
tr:hover td { background: rgba(246, 241, 232, 0.5); }
```

### 9.2 Column Alignment

- `.right` / `text-align: right` — Currency, numbers, actions
- `.center` — Status badges, checkboxes

### 9.3 Table States

- **Loading**: Skeleton rows (future)
- **Empty**: `.empty-state` component
- **Sortable**: Header cursor pointer, sort indicator (future)

---

## 10. Sidebar Navigation

### 10.1 Layout

```css
.sidebar {
  width: 260px;
  background: rgba(255, 250, 242, 0.86);
  border-right: 1px solid var(--line);
  padding: 1rem;
  height: 100vh;
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
}
```

### 10.2 Brand Row

- Height: ~48px
- Brand mark: 1.18rem, weight 900, `--ink`
- Mobile close button: `icon-button` (40×40px)

### 10.3 Navigation Items

```css
.side-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;          /* 10px */
  padding: 0.75rem 0.8rem;  /* 12px / 13px */
  border-radius: var(--radius-md);
  font-weight: 800;
  font-size: 0.9375rem;  /* 15px */
  color: var(--muted);
  transition: background 0.12s ease, color 0.12s ease;
}

.side-link:hover,
.side-link.active {
  background: #EDE4D4;   /* Warm hover */
  color: var(--ink);
}

.side-link svg { width: 18px; height: 18px; flex-shrink: 0; }
```

### 10.4 Sidebar Footer

- Account summary: avatar (38px) + name/email
- Logout button: `button ghost full`

### 10.5 Mobile (< 920px)

- Fixed, off-canvas (`transform: translateX(-105%)`)
- Width: `85vw` max `20rem`
- Transition: `0.18s ease`
- Backdrop: `rgba(10,10,10,0.38)` (shared with modal)
- Hamburger in topbar opens sidebar

---

## 11. Topbar / Navbar

### 11.1 Desktop

```css
.topbar {
  height: 75px (4.7rem);
  background: rgba(246, 241, 232, 0.88);   /* --bg with opacity */
  border-bottom: 1px solid var(--line);
  padding: 0.95rem 1.5rem;
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
```

- Left: Eyebrow ("Freelancer finance workspace") + H1 ("EmberFlow")
- Right: User menu, notifications (future)

### 11.2 Mobile

- Hamburger menu button (icon-button)
- Condensed title

---

## 12. Modals & Dialogs

### 12.1 Backdrop

```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 10, 0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 50;
  animation: fade-in 0.15s ease;
}
```

### 12.2 Modal Card

```css
.modal-card {
  background: var(--surface-strong);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  max-width: 760px;
  width: min(100%, 760px);
  padding: 1rem;
  display: grid;
  gap: 1rem;
  animation: slide-up 0.18s ease;
}
```

### 12.3 Modal Header

```css
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-header h3 { margin: 0; font-size: 1.125rem; font-weight: 700; }

.icon-button.close { width: 40px; height: 40px; }
```

### 12.4 Animations

```css
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
```

---

## 13. Status Badges

### 13.1 Base

```css
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  font-size: 0.75rem;      /* 12px */
  font-weight: 900;
  text-transform: capitalize;
  min-width: 76px (4.8rem);
  padding: 0.35rem 0.65rem;  /* 5.6px / 10.4px */
}
```

### 13.2 Variants

| Status | Background | Text | Use Case |
|--------|------------|------|----------|
| `draft` | `--draft-soft` | `--draft` | Unsent invoices |
| `sent` | `--blue-soft` | `--blue-strong` | Sent, awaiting payment |
| `paid` | `--success-soft` | `--success-strong` | Completed |
| `overdue` | `--danger-soft` | `--danger-strong` | Past due |

---

## 14. Avatars & Placeholders

### 14.1 Sizes

| Size | Dimensions | Font Size |
|------|------------|-----------|
| `sm` | 32×32px (2rem) | 0.75rem |
| `md` | 38×38px (2.4rem) | 0.8rem |
| `lg` | 64×64px (4rem) | 1.15rem |

### 14.2 Styles

```css
.avatar-preview {
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--line);
}

.avatar-fallback {
  border-radius: 50%;
  background: #E7DDCB;     /* Warm neutral */
  color: var(--ink);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
}
```

### 14.3 Logo Placeholder

- 128×77px (8rem × 4.8rem)
- Border: `--line`, Radius: `radius-md`
- Background: `#F2EADC`
- Text: "Logo", weight 900, `--muted`

---

## 15. Empty States

```css
.empty-state {
  display: grid;
  justify-items: start;
  place-content: center;
  min-height: 240px (15rem);
  text-align: left;
  gap: 1rem;
}

.empty-state h3 { margin: 0; font-size: 1.125rem; }
.empty-state p { margin: 0; color: var(--muted); line-height: 1.6; }
.empty-state .button { margin-top: 0.5rem; }
```

---

## 16. Loading & Skeleton States

### 16.1 Spinner

```css
.spinner {
  width: 16px (1rem);
  height: 16px (1rem);
  border: 2px solid var(--line);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
```

### 16.2 Loading Row

```css
.loading-row {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--muted);
  font-size: 0.9375rem;
}
```

### 16.3 Skeleton (Future)

- Pulse animation: `opacity 1.2s ease-in-out infinite`
- Colors: `--bg` → `--line` → `--bg`

---

## 17. Tooltips & Popovers (Future)

- Trigger: hover/focus
- Delay: 200ms show, 100ms hide
- Position: top (default), bottom, left, right
- Arrow: 6px
- Background: `--ink`, Text: `--surface-strong`, Radius: `radius-sm`
- Max-width: 280px

---

## 18. Toast Notifications (Future)

- Position: bottom-right (desktop), bottom-center (mobile)
- Stack: max 3, gap 8px
- Auto-dismiss: 4s (success/info), 6s (warning), persistent (error)
- Variants: success, info, warning, error
- Actions: dismiss, undo (where applicable)

---

## 19. Charts & Data Visualization

### 19.1 Color Palette for Charts

```css
--chart-1: #3B82F6;   /* Blue — primary */
--chart-2: #067647;   /* Green — success */
--chart-3: #B54708;   /* Amber — warning */
--chart-4: #B42318;   /* Red — danger */
--chart-5: #8B5CF6;   /* Violet */
--chart-6: #EC4899;   /* Pink */
--chart-7: #0891B2;   /* Cyan */
--chart-mono: #6D675D; /* Muted — secondary series */
```

### 19.2 Chart Style Guidelines

- **Background**: Transparent (inherit panel)
- **Grid lines**: `--line` at 0.5px, dashed
- **Axis labels**: `caption` size, `--muted`
- **Tooltips**: `--surface-strong`, `shadow-lg`, `radius-md`, padding `space-3`
- **Legends**: `body-sm`, `--muted`, interactive (click to toggle)
- **Animations**: 300ms ease-out on mount, 150ms on data change
- **Responsive**: Maintain aspect ratio, min-height 300px

### 19.3 Chart Types Used

| Chart | Library (Future) | Use Case |
|-------|------------------|----------|
| Bar | Recharts / Chart.js | Monthly revenue, client comparison |
| Line | Recharts / Chart.js | Revenue trend, cash flow |
| Donut | Recharts / Chart.js | Revenue by client, payment methods |
| Area | Recharts / Chart.js | Cumulative revenue |
| Sparkline | Custom SVG | Inline trends in stat cards |

---

## 20. Icons

### 20.1 Library

**Lucide React** (current) — 24px base, stroke-width 2

### 20.2 Sizing Scale

| Context | Size | CSS |
|---------|------|-----|
| Button (md) | 18px | `size={18}` |
| Button (lg) | 20px | `size={20}` |
| Nav icon | 18px | `size={18}` |
| Card feature | 24px | `size={24}` |
| Hero/product | 28px | `size={28}` |
| Empty state | 48px | `size={48}` |
| Inline with text | 1em | `style={{ width: '1em', height: '1em' }}` |

### 20.3 Icon Usage Rules

- **Nav**: Outline style, `--muted` default, `--ink` active
- **Buttons**: Match button text color
- **Status**: Semantic colors (blue/success/warning/danger)
- **Decorative**: `aria-hidden="true"`

---

## 21. Animation & Motion

### 21.1 Duration Tokens

| Token | Value | Use Case |
|-------|-------|----------|
| `duration-instant` | 0ms | Immediate feedback |
| `duration-fast` | 120ms | Hover, focus, simple transitions |
| `duration-base` | 180ms | **Default** — modals, dropdowns, sidebar |
| `duration-slow` | 280ms | Complex panels, page transitions |
| `duration-slower` | 400ms | Hero animations, onboarding |

### 21.2 Easing Tokens

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);      /* Default — natural deceleration */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);    /* Modals, drawers */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Playful — toasts, badges */
```

### 21.3 Motion Principles

1. **Respect `prefers-reduced-motion`** — disable non-essential animations
2. **Transform over layout** — use `translate`, `scale`, `opacity`
3. **Stagger children** — 40ms delay per item in lists
4. **Entrance > Exit** — entrance 180ms, exit 120ms

### 21.4 Key Animations (Current)

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Button hover lift | 120ms | ease-out | hover |
| Button press | 80ms | ease-in | active |
| Focus ring | 120ms | ease-out | focus |
| Modal fade + slide | 180ms | ease-in-out | mount |
| Backdrop fade | 150ms | ease-out | mount |
| Sidebar slide | 180ms | ease-out | mobile toggle |
| Spinner rotate | 800ms | linear | continuous |
| Table row hover | 120ms | ease-out | hover |

---

## 22. Responsive Breakpoints

```css
--bp-sm: 480px;    /* Mobile landscape */
--bp-md: 680px;    /* Tablet portrait */
--bp-lg: 920px;    /* Tablet landscape / small desktop */
--bp-xl: 1200px;   /* Desktop */
--bp-2xl: 1440px;  /* Large desktop */
```

### 22.1 Layout Behavior

| Breakpoint | Sidebar | Content | Grid Adjustments |
|------------|---------|---------|------------------|
| `< 920px` | Off-canvas drawer | Full width | All grids → 1col |
| `≥ 920px` | Fixed 260px | `1fr` | Multi-col grids active |

---

## 23. Accessibility (WCAG 2.1 AA)

### 23.1 Contrast Requirements

| Element | Minimum Ratio | Target |
|---------|---------------|--------|
| Body text | 4.5:1 | 7:1 (ink on bg) |
| Large text (18px+) | 3:1 | 4.5:1 |
| UI components | 3:1 | 4.5:1 |
| Focus indicators | 3:1 | 4.5:1 |

### 23.2 Focus Management

- Visible focus ring on **all** interactive elements
- `focus-visible` for keyboard-only focus
- Focus trap in modals
- Restore focus on modal close

### 23.3 Semantic HTML

- `<button>` for actions, `<a>` for navigation
- `<label>` + `<input>` associations
- `<table>` with `<thead>`/`<tbody>`/`<th scope="col">`
- ARIA labels on icon-only buttons
- Live regions for toasts, loading states

### 23.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 24. CSS Architecture (Implementation Plan)

### 24.1 File Structure

```
frontend/src/
├── styles/
│   ├── tokens.css          # All design tokens (custom properties)
│   ├── reset.css           # Normalize, base styles
│   ├── typography.css      # Type scale, utilities
│   ├── layout.css          # Grid, flex, container utilities
│   ├── components/
│   │   ├── buttons.css
│   │   ├── inputs.css
│   │   ├── cards.css
│   │   ├── tables.css
│   │   ├── modals.css
│   │   ├── badges.css
│   │   ├── sidebar.css
│   │   ├── topbar.css
│   │   ├── avatars.css
│   │   ├── empty-state.css
│   │   ├── loading.css
│   │   └── toasts.css
│   ├── utilities.css       # Spacing, color, display utilities
│   └── index.css           # Imports all above
```

### 24.2 Token Naming Convention

```css
/* Format: --category-concept-variant-state */
--color-blue-primary
--color-blue-primary-hover
--color-blue-primary-focus
--space-4
--radius-md
--shadow-md
--duration-base
--ease-out
```

### 24.3 Component Class Pattern

```css
/* BEM-lite with utility escape hatches */
.component {}
.component--variant {}
.component__element {}
.component--state {}

/* Utility overrides via data-attrs or Tailwind-style (future) */
```

---

## 25. Migration Checklist

### Phase 1: Tokens & Foundation
- [ ] Create `tokens.css` with all custom properties
- [ ] Update `styles.css` to import tokens + remove hardcoded values
- [ ] Verify dark mode tokens (no UI yet, but tokens ready)

### Phase 2: Core Components
- [ ] Button variants & sizes (CSS + React wrapper)
- [ ] Input/Select/Textarea + validation states
- [ ] Card/Panel variants
- [ ] Table base + responsive wrapper
- [ ] Modal + Backdrop
- [ ] Status Badge variants
- [ ] Avatar + Placeholder
- [ ] Empty State
- [ ] Loading Spinner + Skeleton

### Phase 3: Layout Components
- [ ] Sidebar (desktop + mobile drawer)
- [ ] Topbar
- [ ] Page containers (content, page-stack, page-header)

### Phase 4: Advanced
- [ ] Toast system
- [ ] Tooltip/Popover
- [ ] Chart theming integration
- [ ] Animation utilities

### Phase 5: Polish
- [ ] Focus-visible polish across all components
- [ ] Reduced motion support
- [ ] Print stylesheets
- [ ] Documentation / Storybook

---

## 26. Open Decisions (Need Approval)

1. **CSS Approach**: Pure CSS custom properties vs. CSS Modules vs. Tailwind CSS
   - *Current*: Plain CSS with custom properties — **recommend staying with this** for zero-dep, maintainable, standards-based

2. **Component Library**: Keep React wrappers thin (current) vs. extract to shared UI package
   - *Recommendation*: Keep in `frontend/src/components` for now; extract when second app exists

3. **Chart Library**: Recharts vs. Chart.js vs. Tremor vs. custom SVG
   - *Recommendation*: **Recharts** — React-native, tree-shakable, good theming

4. **Icon Strategy**: Keep Lucide vs. switch to Phosphor / Tabler / custom SVG set
   - *Recommendation*: **Stay with Lucide** — familiar, complete, tree-shakable

5. **Dark Mode Timeline**: Ship tokens now, UI toggle in v1.1?
   - *Recommendation*: **Tokens only in v1.0**, toggle in v1.1

6. **Spacing/Radius Scale**: Keep current 8px base radius, 4px spacing unit?
   - *Recommendation*: **Yes** — consistent with current codebase

---

## 27. Appendix: Current vs. Spec Delta

| Area | Current | Spec | Action |
|------|---------|------|--------|
| Colors | 18 tokens in `:root` | 35+ tokens organized by category | Expand & reorganize |
| Typography | Inline `clamp()` in CSS | Formal scale with tokens | Extract to tokens |
| Spacing | Magic numbers | 4px base scale | Replace with tokens |
| Radius | Hardcoded `8px` everywhere | `radius-md` token | Tokenize |
| Shadows | 2 values | 6-level elevation | Expand |
| Buttons | 4 variants, 3 sizes | 5 variants, 3 sizes | Add `secondary`, `success` |
| Inputs | Basic + focus | Validation states, addons | Extend |
| Cards | `.panel` only | 6 variants | Add variants |
| Tables | Basic | Hover, empty, sortable | Enhance |
| Sidebar | Works | Mobile drawer spec matches | Document |
| Topbar | Works | Document | Document |
| Modals | Works | Add animations spec | Document |
| Badges | 4 status | 4 status + tokens | Tokenize |
| Animations | Ad-hoc | Formal tokens + principles | Formalize |
| A11y | Partial | Full AA checklist | Audit & fix |

---

**End of Specification**

*This document is a living specification. Implementation should reference this as the single source of truth for design decisions.*
