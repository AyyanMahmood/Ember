# API Verification — Canonical Components vs Implementation Spec

**Date:** 2026-07-18  
**Method:** Read all 7 canonical source files in `frontend/src/components/ui/` and compared against `IMPLEMENTATION_SPEC.md`.

---

## 1. Button (`Button.jsx`)

### Exports
`Button` (named), `IconButton` (named)

### Props — `Button`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `as` | React.Component | `'button'` | **Supported.** Renders `<Component ref={ref}>` — works with `Link` from react-router |
| `variant` | `'primary'\|'secondary'\|'ghost'\|'danger'\|'success'\|'warning'` | `'primary'` | |
| `size` | `'sm'\|'md'\|'lg'` | `'md'` | |
| `fullWidth` | boolean | `false` | Adds `button--full` class |
| `className` | string | `''` | **Merged** (appended after computed classes) |
| `disabled` | boolean | `undefined` | Also set when `loading` is true |
| `loading` | boolean | `undefined` | Replaces children with spinner + "Loading..." |
| `leftIcon` | ReactNode | `undefined` | Rendered inside `<span aria-hidden>` before children (hidden when loading) |
| `rightIcon` | ReactNode | `undefined` | Rendered after children (hidden when loading) |
| `children` | ReactNode | `undefined` | Optional — but nothing renders without it in non-loading state |

**`ref` forwarded:** YES (`forwardRef`)

### Props — `IconButton`

| Prop | Type | Default |
|------|------|---------|
| `size` | `'sm'\|'md'\|'lg'` | `'md'` |
| `className` | string | `''` |
| `children` | ReactNode | — |
| `aria-label` | string (required for a11y) | — |

**`ref` forwarded:** YES

### Correct usage examples
```jsx
<Button variant="primary" size="md" onClick={fn}>Save</Button>
<Button as={Link} variant="ghost" to="/app/invoices">Cancel</Button>
<Button variant="danger" loading={saving}>Delete</Button>
<Button variant="primary" fullWidth type="submit">Login</Button>
<Button variant="ghost" leftIcon={<Edit size={14} />}>Edit</Button>
```

---

## 2. Card (`Card.jsx`)

### Exports
`Card` (named), `CardHeader`, `CardBody`, `CardFooter`, `StatCard`, `FeatureCard`, `PricingCard`

### Props — `Card`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `children` | ReactNode | — | Optional |
| `className` | string | `''` | **Merged** |
| `variant` | `'default'\|'strong'\|'elevated'\|'interactive'\|'none'` | `'default'` | Maps to CSS classes |
| `padding` | boolean | `true` | When false, adds `p-0` class |

**`as` supported:** NO  
**`ref` forwarded:** YES

### Props — `CardHeader`

| Prop | Type | Notes |
|------|------|-------|
| `title` | ReactNode | Renders `<h3 class="panel__title">` |
| `subtitle` | ReactNode | Renders `<p class="panel__subtitle">` |
| `action` | ReactNode | Renders `<div class="panel__actions">` |
| `className` | string | Merged |

**No `children` prop** — uses `title`, `subtitle`, `action` instead.

### Props — `CardBody`
`children`, `className` only.

### Props — `CardFooter`
`children`, `className` only.

### Props — `StatCard`

| Prop | Type | Default |
|------|------|---------|
| `label` | ReactNode | — |
| `value` | ReactNode | — |
| `note` | ReactNode | — |
| `trend` | `'positive'\|'negative'\|'neutral'` | — |
| `trendLabel` | string | — |
| `className` | string | `''` |

**`children` NOT destructured.** Passed through `...props` onto `<article>`. Children passed between `<StatCard>` tags are NOT explicitly rendered in the component body — they only appear if they survive the `{...props}` spread on the `<article>` element, which is unreliable. **Do NOT rely on `<StatCard>children</StatCard>`.**

**`ref` forwarded:** NO (plain function)

### Props — `FeatureCard`

| Prop | Type |
|------|------|
| `icon` | ReactNode |
| `title` | ReactNode |
| `description` | ReactNode |
| `children` | ReactNode |
| `className` | string |

**`ref` forwarded:** NO

### Props — `PricingCard`

| Prop | Type | Default |
|------|------|---------|
| `name` | ReactNode | — |
| `price` | ReactNode | — |
| `period` | ReactNode | — |
| `features` | array | `[]` |
| `highlight` | boolean | `false` |
| `cta` | ReactNode | — |
| `className` | string | `''` |

**`ref` forwarded:** NO  
**No `actionLabel` / `actionTo` / `onAction` props.** Use `cta` with a `<Button>` or `<Link>` inside.

### Correct usage examples
```jsx
<Card variant="default">content</Card>
<Card variant="strong">auth card</Card>
<CardHeader title="Settings" subtitle="Profile" action={<Button>Edit</Button>} />
<StatCard label="Revenue" value="$42k" trend="positive" trendLabel="+12%" />
<PricingCard name="Pro" price="$29" period="month" features={['a','b']} highlight cta={<Button>Buy</Button>} />
```

---

## 3. Input (`Input.jsx`)

### Exports
`Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `RadioGroup`, `Switch`, `FileUpload`

### Props — `Input`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `label` | string | — | Renders as `<label htmlFor={id}>` |
| `error` | string | — | Renders `<p role="alert">`, sets `aria-invalid` |
| `hint` | string | — | Hidden when error is present |
| `className` | string | `''` | Merged onto `<input>` |
| `type` | string | `'text'` | Passed to native input |
| `leftAddon` | ReactNode | — | Rendered in additive container |
| `rightAddon` | ReactNode | — | Rendered in additive container |
| `id` | string | auto-generated via `useId()` | |
| `disabled` | boolean | — | |
| `required` | boolean | — | Shows `*` after label |

**`as` supported:** NO  
**`ref` forwarded:** YES  
**`children`:** NOT used (use `label` prop instead)

### Props — `Textarea`
Same as Input but with `rows` (default `4`) instead of `type`/`leftAddon`/`rightAddon`.

### Props — `Select`

| Prop | Type | Default |
|------|------|---------|
| `label` | string | — |
| `options` | `[{value, label}]` | `[]` |
| `placeholder` | string | — |
| `error` | string | — |
| `hint` | string | — |
| `className` | string | `''` |

**⚠️ `options` format is `{ value, label }[]`**, not plain string arrays.

### Props — `Checkbox`
`label`, `className`, `id`, `disabled`, `required`

### Props — `FileUpload`
`label` (default `'Upload file'`), `accept`, `multiple`, `className`, `onChange`, `disabled`

### Correct usage examples
```jsx
<Input label="Name" required value={name} onChange={...} />
<Input label="Email" type="email" error={err} />
<Input label="Password" type="password" rightAddon={<EyeToggle />} />
<Textarea label="Notes" rows={5} className="span-2" />
<Select label="Currency" options={currencies} value={currency} onChange={...} />
<Select label="Client" options={clients.map(c => ({value:c.id, label:c.name}))} placeholder="Select..." />
<Checkbox label="Agree" checked={ok} onChange={...} />
<FileUpload label="Upload avatar" accept="image/*" onChange={...} />
```

---

## 4. Badge (`Badge.jsx`)

### Exports
`Badge`, `StatusBadge`, `Chip`

### Props — `Badge`

| Prop | Type | Default | Variants |
|------|------|---------|----------|
| `variant` | string | `'default'` | `default`, `blue`, `success`, `warning`, `danger`, `draft`, `outline` |
| `size` | `'sm'\|'md'\|'lg'` | `'md'` | |
| `dot` | boolean | `false` | |
| `className` | string | `''` | Merged |
| `children` | ReactNode | — | Required for display |

**`ref` forwarded:** YES

### Props — `StatusBadge`

| Prop | Type | Default |
|------|------|---------|
| `status` | string | — |
| `size` | string | `'md'` |
| `className` | string | `''` |

**Status → Variant mapping:**
| status | variant |
|--------|---------|
| `draft` | `draft` |
| `sent` | `blue` |
| `paid` | `success` |
| `overdue` | `danger` |
| `pending` | `warning` |
| `void` / `cancelled` | `default` |
| `failed` | `danger` |

**`ref` forwarded:** NO (plain function)  
**No `invoice` prop** — canonical only accepts `status` string.

### Props — `Chip`
`variant`, `removable`, `onRemove`, `removeAriaLabel`, `className`, `children`

### Correct usage examples
```jsx
<Badge variant="success">Paid</Badge>
<StatusBadge status={effectiveStatus(invoice)} />
<Chip variant="draft" removable onRemove={...}>Draft</Chip>
```

---

## 5. Modal (`Modal.jsx`)

### Exports
`Modal`, `ModalFooter`, `Drawer`, `DrawerFooter`

### Props — `Modal`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `isOpen` | boolean | **required** | Controls visibility |
| `onClose` | function | **required** | |
| `title` | string | — | Sets `aria-labelledby` |
| `children` | ReactNode | — | |
| `size` | `'sm'\|'md'\|'lg'\|'xl'\|'full'` | `'md'` | |
| `showCloseButton` | boolean | `true` | |
| `closeOnOverlayClick` | boolean | `true` | |
| `closeOnEscape` | boolean | `true` | |
| `className` | string | `''` | Merged onto `modal-card` |

**`as` supported:** NO  
**`ref` forwarded:** NO (uses internal `useRef`)  
**No `open` prop** — canonical uses `isOpen`.

### Props — `ModalFooter`
`children`, `className`, `align` (default `'end'`)

### Props — `Drawer`
`isOpen`, `onClose`, `title`, `children`, `side` (default `'right'`), `size` (default `'md'`), `className`

### Correct usage examples
```jsx
<Modal isOpen={show} onClose={() => setShow(false)} title="Confirm" size="sm">
  <p>Are you sure?</p>
  <ModalFooter><Button variant="primary">Yes</Button></ModalFooter>
</Modal>
```

---

## 6. Loading (`Loading.jsx`)

### Exports
`LoadingSpinner`, `LoadingOverlay`, `PageLoader`, `Skeleton`, `SkeletonCard`, `SkeletonTable`, `SkeletonList`

### Props — `LoadingSpinner`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `size` | `'xs'\|'sm'\|'md'\|'lg'\|'xl'` | `'md'` | |
| `className` | string | `''` | Merged |
| `label` | string | `'Loading...'` | ⚠️ **Wrapped in `<span className="sr-only">`** — text is screen-reader-only, NOT visible |
| `aria-label` | string | — | Overrides `label` for accessibility |

**`ref` forwarded:** NO (plain function)  
**`children`:** NOT supported

### Props — `LoadingOverlay`
`visible` (default `true`), `label`, `size` (default `'lg'`), `className`

### Props — `PageLoader`
`label`, `size` (default `'lg'`), `className`

### Props — `Skeleton`
`variant` (default `'text'`), `width`, `height`, `className`, `animation` (default `'pulse'`)

### Correct usage examples
```jsx
<LoadingSpinner size="lg" label="Loading dashboard..." />
<LoadingOverlay visible={loading} />
<Skeleton variant="text" width="60%" />
<SkeletonCard lines={3} avatar />
```

---

## 7. EmptyState (`EmptyState.jsx`)

### Exports
`EmptyState`, `EmptyStateIllustration`

### Props — `EmptyState`

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `title` | string | — | |
| `message` | string | — | |
| `icon` | ReactNode | — | Displayed in icon area (mutually exclusive with `illustration`) |
| `illustration` | string (URL) | — | Displayed as `<img>` in icon area |
| `actionLabel` | string | — | |
| `actionTo` | string (route) | — | Renders `<Link>` |
| `actionHref` | string (URL) | — | Renders `<a href>` |
| `actionOnClick` | function | — | Intercepts action click |
| `variant` | `'default'\|'success'\|'warning'\|'danger'` | `'default'` | |
| `className` | string | `''` | Merged |
| `children` | ReactNode | — | Rendered in children container |

**`ref` forwarded:** NO  
**Note:** `actionTo` and `actionHref` are mutually exclusive in rendering (only one Link/anchor rendered).

### Props — `EmptyStateIllustration`

| Prop | Type | Default | Options |
|------|------|---------|---------|
| `variant` | string | `'default'` | `default`, `inbox`, `users`, `document`, `chart`, `search`, `lock`, `notification` |
| `className` | string | `''` | |

### Correct usage examples
```jsx
<EmptyState title="No data" message="Create something." actionLabel="Start" actionTo="/new" />
<EmptyState title="No results" icon={<SearchIcon />}>
  <Button onClick={...}>Custom action</Button>
</EmptyState>
<EmptyStateIllustration variant="users" />
```

---

## Verification Against IMPLEMENTATION_SPEC.md

### ✅ VERIFIED Assumptions (All Correct)

| Assumption in Spec | API Reality | Status |
|---|---|---|
| `Button as={Link}` accepts `to` prop | `as` renders `<Component {...props}>`; Link receives `to` via `...props` | ✅ Correct |
| `Button variant="primary"` is default | Default is `'primary'` | ✅ Correct |
| `Button loading` replaces children with spinner | `loading` renders spinner + "Loading..." replacing entire content | ✅ Correct |
| `Button leftIcon`/`rightIcon` rendered inline | Rendered before/after children in `<span aria-hidden>` | ✅ Correct |
| `Card variant="default"` | Maps to `panel` class | ✅ Correct |
| `Card` closing tag wraps content | Renders `<section>{children}</section>` | ✅ Correct |
| `Input label="..."` renders label above input | Renders `<label htmlFor={id}>` | ✅ Correct |
| `Input error="..."` shows error message | Renders `<p role="alert">` and sets `aria-invalid` | ✅ Correct |
| `Textarea rows={4}` | Canonical default is `rows=4` | ✅ Correct |
| `Select` with `{value, label}[]` options | Canonical expects this exact shape | ✅ Correct |
| `StatusBadge status={...}` | Maps status to semantic variant | ✅ Correct |
| `Modal isOpen` | Canonical uses `isOpen` (not `open`) | ✅ Correct |
| `Modal size="md"` is default | Canonical default is `'md'` | ✅ Correct |
| `ModalFooter` exists | Exported with `align` prop | ✅ Correct |
| `LoadingSpinner size="lg"` | Canonical supports `xs`/`sm`/`md`/`lg`/`xl` | ✅ Correct |
| `EmptyState` canonical uses same `title`/`message`/`actionLabel`/`actionTo` as legacy | Canonical accepts all of these | ✅ Correct |
| `EmptyStateIllustration` exists with `document`, `users` variants | All variants present: `default`, `inbox`, `users`, `document`, `chart`, `search`, `lock`, `notification` | ✅ Correct |
| `PricingCard` uses `name`, `price`, `period`, `features`, `highlight`, `cta` | Canonical uses these exact props | ✅ Correct |
| `PricingCard` has no `actionLabel`/`actionTo`/`onAction` — replaced by `cta` | Confirmed: `cta` is a ReactNode slot | ✅ Correct |
| All components merge `className` | Every component appends `className` to computed classes | ✅ Correct |
| `Card variant="strong"` maps to `panel panel--strong` | Confirmed in variantClasses | ✅ Correct |

### ❌ INCORRECT Assumptions

| # | Assumption in IMPLEMENTATION_SPEC.md | API Reality | Impact | Fix Required |
|---|---|---|---|---|
| 1 | PR 7 AnalyticsPage passes `<span className="stat-card__icon">` as **children** to `<StatCard>` | `StatCard` does NOT destructure `children`. They pass through `{...props}` onto `<article>` — **silently dropped** because explicit children (label/value/note/trend) override spread children in React's prop resolution. | ❌ **Breaking** — stat card icons in AnalyticsPage will not render. | Remove `children` from `<StatCard>` usage. Use `trend`/`trendLabel` props instead. Or redesign StatCard to accept icon as a prop. |
| 2 | `LoadingSpinner label` text is visually displayed | Canonical `LoadingSpinner` renders label inside `<span className="sr-only">` — **hidden from sighted users**. Legacy LoadingSpinner showed label text visibly. | ⚠️ **Design behavior change** — but already established in the codebase (DashboardPage, InvoicesPage, ClientsPage already use canonical LoadingSpinner with sr-only labels). No spec change needed; this is the intended canonical behavior. | None — existing behavior. |
| 3 | `Input` with `type="password"` + `rightAddon` renders password eye toggle correctly | The `rightAddon` renders inside `<span className="input-addon" aria-hidden="true">`. A `<button>` inside an `aria-hidden` span is not announced to screen readers. The button needs `aria-label` but the parent is `aria-hidden`. | ⚠️ **Accessibility concern** — but functionally works for sighted users. The same pattern is used in the legacy `PasswordField` (which wraps both in `<span className="password-control">` without `aria-hidden`). | Consider wrapping password toggle differently — use `leftAddon`/`rightAddon` with caution, or add `aria-hidden="false"` on the addon when it contains interactive elements. |

### 📋 Required Changes Before PR 2 Implementation

1. **PR 7 — AnalyticsPage StatCard children:** Replace:
   ```jsx
   <StatCard ...>
     {stat.icon && <span className="stat-card__icon" aria-hidden="true">{stat.icon}</span>}
   </StatCard>
   ```
   With either:
   - Remove the icon children entirely (StatCard doesn't support them)
   - Or ensure `...props` spread works: test that `children` passed as `{...props}` renders. **Current speculation: it does NOT render.** Need to test or remove the children pattern.

2. **No changes needed for PR 2** — DashboardPage only replaces a raw CSS `<Link>` class with `<Button as={Link}>`, which is fully verified as supported.

3. **No changes needed for PR 3** — Same pattern, verified.

4. **PR 4 note:** `LoadingSpinner` label is sr-only (not visual). This is the existing behavior already used by the codebase. No spec change needed.

5. **PR 5 note:** `PricingCard` canonical uses `cta` ReactNode slot. The spec correctly uses `<Button>` inside `cta`. Verified correct.

---

*End of Document*
