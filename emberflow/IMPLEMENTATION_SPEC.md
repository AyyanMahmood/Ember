# EmberFlow Implementation Specification

**Authority:** EMBER_DESIGN_BIBLE.md (canonical design) + MIGRATION_PLAN.md (sequence)  
**Status:** Ready for execution  
**Last Updated:** 2026-07-18

---

## PR 1 — Dead Code Removal & Quick Wins

### Files Deleted (5)
| File | Lines | Reason |
|------|-------|--------|
| `frontend/src/styles.css` | 1339 | Zero imports across all `.jsx`/`.js`/`.html` files |
| `frontend/src/components/StatCard.jsx` | — | Zero import references across all pages |
| `frontend/src/components/Input.jsx` | — | Zero import references across all pages |
| `frontend/src/components/Table.jsx` | — | Zero import references across all pages |
| `frontend/src/components/Card.jsx` | — | Zero import references across all pages |

### Files Modified (1)
- `frontend/src/services/supabase.js` — remove lines 3-5 (three `console.log` statements)

### Import Replacements
None — all deleted files have zero runtime references.

### Expected Git Diff
- `styles.css`: -1339 lines
- `supabase.js`: -3 lines
- 4× legacy components: ~-100 lines total
- **Total: ~-1442 lines, 6 files changed**

### Manual Verification Checklist
- [ ] `grep -rn "StatCard\|Input\|Table\|Card" frontend/src/pages/ --include="*.jsx"` — confirms zero legacy import paths remain
- [ ] `grep -rn "styles\.css" frontend/ --include="*.{jsx,js,html}"` — confirms zero matches
- [ ] `frontend/src/services/supabase.js` — confirm lines 3-5 removed (no console.log)

### Build Verification
```bash
npm run build
```
Must exit with code 0.

### Rollback
```bash
git checkout HEAD -- frontend/src/styles.css frontend/src/services/supabase.js
git checkout HEAD -- frontend/src/components/StatCard.jsx frontend/src/components/Input.jsx frontend/src/components/Table.jsx frontend/src/components/Card.jsx
```

---

## PR 2 — DashboardPage CSS Class Cleanup

### Files Modified (1)
- `frontend/src/pages/DashboardPage.jsx`

### Imports to Add
- `{ Button }` from `'../components/ui/Button.jsx'`

### Imports to Remove
None (DashboardPage already uses canonical imports for all other components).

### Replacements (exact)
| Line(s) | Old | New |
|---------|-----|-----|
| 134 | `<Link className="button button--primary" to="/app/invoices/new">` | `<Link to="/app/invoices/new"><Button variant="primary">` |
| — | `New invoice` | inside `<Button>` above |
| — | `</Link>` moved to close after `</Button>` |

Wait — `Link` wrapping a `Button` creates nested `<a>` + `<button>`. Fix: use `<Button as={Link} variant="primary" to="/app/invoices/new">` instead.

**Corrected replacement for lines 134–136:**
```
<Button as={Link} variant="primary" to="/app/invoices/new">
  New invoice
</Button>
```

Remove standalone `<Link className="button button--primary" ...>` and its children.

### Expected Git Diff
- `DashboardPage.jsx`: ~+5 lines (~-3 lines) — minimal, only button Link changed
- **Total: ~+5/-3 lines, 1 file changed**

### Manual Verification Checklist
- [ ] No remaining `className="button"` or `className="button--*"` patterns
- [ ] `Button as={Link}` used (not nested `<Link><Button>`)
- [ ] Button variant is `"primary"`, size is `"md"` (canonical default)
- [ ] Visual output matches: primary-style link to `/app/invoices/new`

### Build Verification
```bash
npm run build
```
Must exit with code 0.

### Rollback
```bash
git checkout HEAD -- frontend/src/pages/DashboardPage.jsx
```

---

## PR 3 — InvoicesPage & ClientsPage CSS Class Cleanup

### Files Modified (2)
- `frontend/src/pages/InvoicesPage.jsx`
- `frontend/src/pages/ClientsPage.jsx`

### Imports to Add
- InvoicesPage: `{ Button }` from `'../components/ui/Button.jsx'` (already imported)

### Imports to Remove
- ClientsPage: none (already has all canonical imports)

### Replacements — InvoicesPage.jsx

| Line(s) | Old | New |
|---------|-----|-----|
| 122–128 | `<Link ... className="button button--ghost button--sm">` + `<Edit size={14} />` + `Edit` + `</Link>` | `<Button as={Link} variant="ghost" size="sm" to={\`/app/invoices/${invoice.id}/edit\`} leftIcon={<Edit size={14} />}>Edit</Button>` |
| 156–159 | `<Link className="button button--primary" to="/app/invoices/new">` + `<Plus size={16} />` + `New invoice` + `</Link>` | `<Button as={Link} variant="primary" to="/app/invoices/new" leftIcon={<Plus size={16} />}>New invoice</Button>` |

### Replacements — ClientsPage.jsx

| Line(s) | Old | New |
|---------|-----|-----|
| 93–95 | `<Link to={\`/app/clients/${client.id}/edit\`} className="button button--ghost button--sm">` + `<Edit size={14} />` + `Edit` + `</Link>` | `<Button as={Link} variant="ghost" size="sm" to={\`/app/clients/${client.id}/edit\`} leftIcon={<Edit size={14} />}>Edit</Button>` |
| 119–122 | `<Link className="button button--primary" to="/app/clients/new">` + `<Plus size={16} />` + `Add client` + `</Link>` | `<Button as={Link} variant="primary" to="/app/clients/new" leftIcon={<Plus size={16} />}>Add client</Button>` |

### Expected Git Diff
- InvoicesPage.jsx: ~+4/-6 lines
- ClientsPage.jsx: ~+4/-6 lines
- **Total: ~+8/-12 lines, 2 files changed**

### Manual Verification Checklist
- [ ] InvoicesPage: "Edit" action buttons are ghost sm
- [ ] InvoicesPage: "New invoice" header link is primary button
- [ ] ClientsPage: "Edit" action buttons are ghost sm
- [ ] ClientsPage: "Add client" header link is primary button
- [ ] No remaining `className="button"` patterns in either file

### Build Verification
```bash
npm run build
```
Must exit with code 0.

### Rollback
```bash
git checkout HEAD -- frontend/src/pages/InvoicesPage.jsx frontend/src/pages/ClientsPage.jsx
```

---

## PR 4 — StatusBadge & EmptyState & LoadingSpinner Legacy Replacement

### Files Deleted (3)
- `frontend/src/components/StatusBadge.jsx`
- `frontend/src/components/EmptyState.jsx`
- `frontend/src/components/LoadingSpinner.jsx`

### Files Modified (3)
- `frontend/src/pages/InvoiceDetailPage.jsx`
- `frontend/src/pages/ProposalsPage.jsx`
- `frontend/src/components/FeatureGate.jsx`

### Import Replacements

**InvoiceDetailPage.jsx:**
| Old Import | New Import |
|------------|------------|
| `import StatusBadge from '../components/StatusBadge.jsx'` | `import { StatusBadge } from '../components/ui/Badge.jsx'` |

**Prop change:** `<StatusBadge invoice={invoice} />` → `<StatusBadge status={effectiveStatus(invoice)} />`  
(The legacy component accepted `invoice` and called `effectiveStatus` internally; canonical requires pre-computed `status`.)

**ProposalsPage.jsx:**
| Old Import | New Import |
|------------|------------|
| `import EmptyState from '../components/EmptyState.jsx'` | `import { EmptyState } from '../components/ui/EmptyState.jsx'` |

**Prop compatibility:** Legacy uses `{ title, message, actionLabel, actionTo }`. Canonical uses same props. No changes needed.

**Also:** ProposalsPage line 54 uses `<Link className="button primary" to="/app/proposals/new">` — raw CSS class. Replace with:
```
<Button as={Link} variant="primary" to="/app/proposals/new" leftIcon={<Plus size={16} />}>
  New proposal
</Button>
```

**FeatureGate.jsx:**
| Old Import | New Import |
|------------|------------|
| `import LoadingSpinner from './LoadingSpinner.jsx'` | `import { LoadingSpinner } from './ui/Loading.jsx'` |

**Prop compatibility:** Legacy uses `{ label }`. Canonical uses `{ size, label }`. Add `size="md"` to match legacy behavior.

| Uses | Old | New |
|------|-----|-----|
| FeatureGate line 10 | `<LoadingSpinner label="Checking plan..." />` | `<LoadingSpinner size="md" label="Checking plan..." />` |

### Expected Git Diff
- InvoiceDetailPage.jsx: ~+2/-2 lines
- ProposalsPage.jsx: ~+4/-4 lines (includes Button replacement)
- FeatureGate.jsx: ~+2/-2 lines
- 3 legacy files deleted: ~-29 lines total
- **Total: ~+8/-37 lines, 6 files changed**

### Manual Verification Checklist
- [ ] InvoiceDetailPage: `StatusBadge` uses `status={effectiveStatus(invoice)}` — all invoice statuses (draft, sent, paid, overdue) display correctly
- [ ] ProposalsPage: EmptyState renders with illustration and CTA
- [ ] ProposalsPage: "New proposal" link is a primary button (not raw CSS)
- [ ] FeatureGate: loading spinner shows during subscription check
- [ ] All three legacy components confirmed deleted

### Build Verification
```bash
npm run build
```
Must exit with code 0.

### Rollback
```bash
git checkout HEAD -- frontend/src/pages/InvoiceDetailPage.jsx frontend/src/pages/ProposalsPage.jsx frontend/src/components/FeatureGate.jsx
git checkout HEAD -- frontend/src/components/StatusBadge.jsx frontend/src/components/EmptyState.jsx frontend/src/components/LoadingSpinner.jsx
```

---

## PR 5 — Button, Modal, PricingCard Legacy Chain Removal

### Files Deleted (3)
- `frontend/src/components/Button.jsx`
- `frontend/src/components/Modal.jsx`
- `frontend/src/components/PricingCard.jsx`

### Files Modified (3)
- `frontend/src/components/UpgradeModal.jsx`
- `frontend/src/pages/PricingPage.jsx`
- `frontend/src/pages/LandingPage.jsx`

### Import Replacements

**UpgradeModal.jsx:**
| Old Import | New Import |
|------------|------------|
| `import Modal from './Modal.jsx'` | `import { Modal } from './ui/Modal.jsx'` |
| `import PricingCard from './PricingCard.jsx'` | `import { PricingCard } from './ui/Card.jsx'` |

**Prop mapping — Modal:**
| Legacy | Canonical |
|--------|-----------|
| `open` | `isOpen` |
| `title` | `title` (same) |
| `onClose` | `onClose` (same) |

So: `<Modal open={open} title="..." onClose={onClose}>` → `<Modal isOpen={open} title="..." onClose={onClose}>`

**Prop mapping — PricingCard:**
| Legacy prop | Legacy shape | Canonical prop | Canonical shape |
|------------|-------------|----------------|-----------------|
| `plan` | `{ name, price, cadence, features }` | `name` / `price` / `period` / `features` | Separate props |
| `highlight` | Boolean | `highlight` | Same |
| `actionLabel` | String | N/A — use `cta` prop | ReactNode |
| `onAction` | Function | N/A — use `cta` | Wrap in `<Button>` |
| `actionTo` | String | N/A — use `cta` | Wrap in `<Link>` |

**UpgradeModal transformation (lines 29–39):**

The two `<PricingCard>` calls with `plan={PLANS.pro_monthly}` and `plan={PLANS.pro_yearly}` must be rewritten to canonical prop shape:

```jsx
<PricingCard
  name={PLANS.pro_monthly.name}
  price={PLANS.pro_monthly.price}
  period={PLANS.pro_monthly.cadence}
  features={PLANS.pro_monthly.features}
  highlight
  cta={
    <Button
      variant="primary"
      fullWidth
      onClick={() => checkout('pro_monthly')}
      loading={loadingPlan === 'pro_monthly'}
    >
      Upgrade monthly
    </Button>
  }
/>
```

Also need to import `{ Button }` from `'./ui/Button.jsx'` in `UpgradeModal.jsx`.

**PricingPage.jsx:**
| Old Import | New Import |
|------------|------------|
| `import PricingCard from '../components/PricingCard.jsx'` | `import { PricingCard } from '../components/ui/Card.jsx'` |

**Prop changes for PricingPage.jsx (3 uses of PricingCard):**
| Legacy | Canonical |
|--------|-----------|
| `<PricingCard plan={PLANS.free} actionLabel="Start free" actionTo="/register" />` | `<PricingCard name={PLANS.free.name} price={PLANS.free.price} period={PLANS.free.cadence} features={PLANS.free.features} cta={<Button as={Link} variant="secondary" to="/register" fullWidth>Start free</Button>} />` |
| `<PricingCard plan={PLANS.pro_monthly} highlight actionLabel="Start monthly" actionTo="/register" />` | `<PricingCard name={PLANS.pro_monthly.name} price={PLANS.pro_monthly.price} period={PLANS.pro_monthly.cadence} features={PLANS.pro_monthly.features} highlight cta={<Button as={Link} variant="primary" to="/register" fullWidth>Start monthly</Button>} />` |
| `<PricingCard plan={PLANS.pro_yearly} actionLabel="Start yearly" actionTo="/register" />` | `<PricingCard name={PLANS.pro_yearly.name} price={PLANS.pro_yearly.price} period={PLANS.pro_yearly.cadence} features={PLANS.pro_yearly.features} cta={<Button as={Link} variant="primary" to="/register" fullWidth>Start yearly</Button>} />` |

Need to add imports: `{ Link }` from `react-router-dom`, `{ Button }` from `'../components/ui/Button.jsx'`.

**LandingPage.jsx:**
| Old Import | New Import |
|------------|------------|
| `import PricingCard from '../components/PricingCard.jsx'` | `import { PricingCard } from '../components/ui/Card.jsx'` |

**Prop changes for LandingPage.jsx (2 uses of PricingCard):**
| Legacy | Canonical |
|--------|-----------|
| `<PricingCard plan={PLANS.free} actionLabel="Start free" actionTo="/register" />` | `<PricingCard name={PLANS.free.name} price={PLANS.free.price} period={PLANS.free.cadence} features={PLANS.free.features} cta={<Button as={Link} variant="secondary" to="/register" fullWidth>Start free</Button>} />` |
| `<PricingCard plan={PLANS.pro_monthly} highlight actionLabel="Start Pro" actionTo="/register" />` | `<PricingCard name={PLANS.pro_monthly.name} price={PLANS.pro_monthly.price} period={PLANS.pro_monthly.cadence} features={PLANS.pro_monthly.features} highlight cta={<Button as={Link} variant="primary" to="/register" fullWidth>Start Pro</Button>} />` |

Need to add imports: `{ Link }` from `react-router-dom`, `{ Button }` from `'../components/ui/Button.jsx'`.

### Expected Git Diff
- UpgradeModal.jsx: ~+35/-15 lines
- PricingPage.jsx: ~+22/-4 lines (was 18 lines → ~36 lines)
- LandingPage.jsx: ~+15/-4 lines
- 3 legacy files deleted: ~-50 lines total
- **Total: ~+72/-73 lines, 6 files changed**

### Manual Verification Checklist
- [ ] UpgradeModal opens correctly with `isOpen` prop
- [ ] UpgradeModal shows two pricing cards with correct plan data (name, price, period, features list)
- [ ] Upgrade buttons call `startCheckout(plan)` correctly
- [ ] PricingPage renders three plans (Free, Pro Monthly, Pro Yearly) with correct data
- [ ] LandingPage renders pricing teaser section with Free and Pro Monthly
- [ ] All three legacy components confirmed deleted after build

### Build Verification
```bash
npm run build
```
Must exit with code 0.

### Rollback
```bash
git checkout HEAD -- frontend/src/components/UpgradeModal.jsx frontend/src/pages/PricingPage.jsx frontend/src/pages/LandingPage.jsx
git checkout HEAD -- frontend/src/components/Button.jsx frontend/src/components/Modal.jsx frontend/src/components/PricingCard.jsx
```

---

## PR 6 — UpgradeModal & FeatureGate Full Migration

### Files Modified (2)
- `frontend/src/components/UpgradeModal.jsx` — already migrated in PR 5; verify it uses canonical Modal, PricingCard, Button
- `frontend/src/components/FeatureGate.jsx` — replace legacy imports with canonical; verify LoadingSpinner uses canonical import

### Import Replacements

**FeatureGate.jsx:**
- Already done in PR 4: `LoadingSpinner` from `./ui/Loading.jsx`
- `UpgradeModal` is a local import: `import UpgradeModal from './UpgradeModal.jsx'` — no path change needed; UpgradeModal was already migrated in PR 5

### Verification (no code changes needed if PR 4 + PR 5 were executed)
- [ ] FeatureGate line 3: `import { LoadingSpinner } from './ui/Loading.jsx'` (not `./LoadingSpinner.jsx`)
- [ ] FeatureGate line 10: `size="md"` prop on LoadingSpinner
- [ ] UpgradeModal: all internal components canonical (Modal, PricingCard, Button)

### Expected Git Diff
- FeatureGate.jsx: ~+2/-2 lines (already done in PR 4 — no additional changes needed)
- **Total: 0 new changes** if PR 4 + PR 5 were correctly executed

### Blast Radius (8 pages indirectly tested)
| Page | Depends on |
|------|-----------|
| SettingsPage | FeatureGate (for branding section) |
| AnalyticsPage | FeatureGate (for analytics gate) |
| ProposalsPage | FeatureGate (for proposals gate) |
| ProposalFormPage | FeatureGate (for proposals gate) |
| InvoiceDetailPage | UpgradeModal (for payment tracking upgrade) |
| InvoiceFormPage | UpgradeModal (for invoice limit upgrade) |
| DashboardPage | None — already canonical |
| ClientsPage | None — already canonical |

### Manual Verification Checklist
- [ ] SettingsPage: branding section shows upgrade prompt for Free users
- [ ] AnalyticsPage: analytics gated behind FeatureGate for Free users
- [ ] ProposalsPage: proposal list gated behind FeatureGate
- [ ] InvoiceFormPage: creating 6th invoice triggers UpgradeModal
- [ ] InvoiceDetailPage: clicking "Record payment" as Free user triggers UpgradeModal
- [ ] All 8 pages compile without errors

### Build Verification
```bash
npm run build
```
Must exit with code 0.

### Rollback
```bash
git checkout HEAD -- frontend/src/components/UpgradeModal.jsx frontend/src/components/FeatureGate.jsx
```

---

## PR 7 — Mass Page Migration: Independent Pages

### Files Modified (5)
- `frontend/src/pages/ClientFormPage.jsx`
- `frontend/src/pages/ClientDetailPage.jsx`
- `frontend/src/pages/ForgotPasswordPage.jsx`
- `frontend/src/pages/FeaturesPage.jsx`
- `frontend/src/pages/ContactPage.jsx`

---

### ClientFormPage.jsx

#### Imports to Add
```jsx
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
```

#### Replacements
| Line(s) | Old | New |
|---------|-----|-----|
| 76 | `<form className="panel form-grid" onSubmit={handleSubmit}>` | `<Card variant="default"><form className="form-grid" onSubmit={handleSubmit}>` |
| 78 | `<label>Name<input ... /></label>` (lines 78-81) | `<Input label="Name" required value={form.name} onChange={(e) => updateField('name', e.target.value)} />` |
| 82–90 | `<label>Email<input ... /></label>` | `<Input label="Email" type="email" required value={form.email} onChange={(e) => updateField('email', e.target.value)} />` |
| 91–94 | `<label>Company<input ... /></label>` | `<Input label="Company" value={form.company} onChange={(e) => updateField('company', e.target.value)} />` |
| 95–98 | `<label>Phone<input ... /></label>` | `<Input label="Phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />` |
| 99–102 | `<label>Country<input ... /></label>` | `<Input label="Country" value={form.country} onChange={(e) => updateField('country', e.target.value)} />` |
| 103–106 | `<label className="span-2"><textarea ... /></label>` | `<Textarea label="Notes" rows={5} className="span-2" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />` |
| 108–113 | `<Link className="button ghost" ...>Cancel</Link>` + `<button className="button primary" ...>Save client</button>` | `<Button as={Link} variant="ghost" to="/app/clients">Cancel</Button>` + `<Button variant="primary" disabled={saving} type="submit">{saving ? 'Saving...' : 'Save client'}</Button>` |

**Close the Card:** After `</form>`, add `</Card>`.

#### Edge Cases
- The `<div className="form-actions span-2">` wrapper should be kept for layout
- The `<p className="form-error">` should be replaced with `error` prop pattern — since ClientFormPage uses a single error string, wrap in `<Card>` with `role="alert"` or keep as-is styled. Keep as-is for now (non-breaking visual change).

#### Expected Git Diff
- ClientFormPage.jsx: ~118→~130 lines (~+60/-48 lines)

---

### ClientDetailPage.jsx

#### Imports to Add
```jsx
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
```

#### Replacements
| Line(s) | Old | New |
|---------|-----|-----|
| 50–56 | `<Link className="button ghost" to={...}>Edit</Link>` + `<button className="button danger" onClick={...}>Delete</button>` | `<Button as={Link} variant="ghost" to={\`/app/clients/${id}/edit\`}>Edit</Button>` + `<Button variant="danger" onClick={handleDelete}>Delete</Button>` |
| 60 | `<div className="panel">` | `<Card variant="default">` |
| Closing at line 72 | `</div>` | `</Card>` |
| 73 | `<div className="panel">` | `<Card variant="default">` |
| Closing at line 77 | `</div>` | `</Card>` |
| 79 | `<section className="panel">` | `<Card variant="default">` |
| Closing at line 113 | `</section>` | `</Card>` |
| 39 | `<div className="panel">Loading client...</div>` | `<Card variant="default">Loading client...</Card>` |
| 40 | `<div className="panel error-panel">{error}</div>` | `<Card variant="default"><div className="error-panel" role="alert">{error}</div></Card>` |

#### Expected Git Diff
- ClientDetailPage.jsx: ~+12/-18 lines

---

### ForgotPasswordPage.jsx

#### Imports to Add
```jsx
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
```

#### Replacements
| Line(s) | Old | New |
|---------|-----|-----|
| 32 | `<form className="auth-card" ...>` | `<Card variant="strong"><form ...>` |
| 37–40 | `<label>Email<input ... /></label>` | `<Input label="Email" type="email" required value={email} onChange={...} />` |
| 43–45 | `<button className="button primary full" ...>Send reset link</button>` | `<Button variant="primary" fullWidth disabled={submitting} type="submit">{submitting ? 'Sending...' : 'Send reset link'}</Button>` |
| Close after line 50 | `</form>` | `</form></Card>` |

#### Expected Git Diff
- ForgotPasswordPage.jsx: ~+8/-10 lines

---

### FeaturesPage.jsx

#### Imports to Add
```jsx
import { Card } from '../components/ui/Card.jsx';
```

#### Replacements
| Line(s) | Old | New |
|---------|-----|-----|
| 18–25 | `<div className="feature-grid">` + `{groups.map(...)}` + `<article key={title}>...<h3>{title}</h3><p>{description}</p></article>` + `</div>` | `<div className="feature-grid">{groups.map(([title, description, Icon]) => <Card variant="default" key={title}><Icon size={24} /><h3>{title}</h3><p>{description}</p></Card>)}</div>` |

#### Expected Git Diff
- FeaturesPage.jsx: ~+5/-8 lines

---

### ContactPage.jsx

#### Imports to Add
```jsx
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
```

#### Replacements
| Line(s) | Old | New |
|---------|-----|-----|
| 19–38 | `<div className="contact-methods">` + 3× `<div className="contact-card">` + `</div>` | `<div className="contact-methods">` + 3× `<Card variant="default">` + `</div>` |
| 23–25 | `<a className="button primary" href="mailto:support@emberflow.com">` | `<Button as="a" variant="primary" href="mailto:support@emberflow.com">` |

**Check:** `<Button as="a">` — canonical Button supports `as` prop, renders as `<a>`. Verify href is passed through to the underlying element.

#### Expected Git Diff
- ContactPage.jsx: ~+6/-8 lines

---

### PR 7 Summary

| File | Old Lines | New Lines | Δ |
|------|-----------|-----------|---|
| ClientFormPage.jsx | 118 | ~130 | +12 |
| ClientDetailPage.jsx | 115 | ~109 | -6 |
| ForgotPasswordPage.jsx | 52 | ~50 | -2 |
| FeaturesPage.jsx | 29 | ~26 | -3 |
| ContactPage.jsx | 61 | ~59 | -2 |
| **Total** | **375** | **~374** | **~-1 line** |

### Manual Verification Checklist
- [ ] ClientFormPage: all form fields use `<Input>` with `label` prop, save/cancel use `<Button>`, panel uses `<Card>`
- [ ] ClientDetailPage: contact panel + notes panel + invoices section use `<Card>`, action buttons use `<Button>`
- [ ] ForgotPasswordPage: form uses `<Card variant="strong">`, email input uses `<Input label="Email">`, submit uses `<Button variant="primary" fullWidth>`
- [ ] FeaturesPage: feature grid cards use `<Card variant="default">`
- [ ] ContactPage: contact cards use `<Card>`, email link uses `<Button as="a">`
- [ ] All 5 pages: zero raw CSS class names for `button`, `panel`

### Build Verification
```bash
npm run build
```
Must exit with code 0.

### Rollback
```bash
git checkout HEAD -- frontend/src/pages/ClientFormPage.jsx frontend/src/pages/ClientDetailPage.jsx frontend/src/pages/ForgotPasswordPage.jsx frontend/src/pages/FeaturesPage.jsx frontend/src/pages/ContactPage.jsx
```

---

## PR 8 — Auth Pages & SettingsPage Final Migration

### Files Modified (6)
- `frontend/src/pages/SettingsPage.jsx`
- `frontend/src/pages/AuthPage.jsx`
- `frontend/src/pages/ResetPasswordPage.jsx`
- `frontend/src/pages/InvoiceFormPage.jsx`
- `frontend/src/pages/InvoiceDetailPage.jsx`
- `frontend/src/pages/ProposalFormPage.jsx`

### Files Deleted (1)
- `frontend/src/components/PasswordField.jsx` (lines 1–30)

---

### AuthPage.jsx

#### Imports to Remove
```jsx
import PasswordField from '../components/PasswordField.jsx';
```

#### Imports to Add
```jsx
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
```

#### Replacements
| Line(s) | Old | New |
|---------|-----|-----|
| 49 | `<form className="auth-card" ...>` | `<Card variant="strong"><form ...>` |
| 54–63 | `<label>Name<input ... /></label>` (signup only) | `<Input label="Name" required value={form.name} onChange={...} autoComplete="name" />` |
| 65–73 | `<label>Email<input ... /></label>` | `<Input label="Email" type="email" required value={form.email} onChange={...} autoComplete="email" />` |
| 75–79 | `<PasswordField value={...} onChange={...} autoComplete={...} />` | `<Input label="Password" type="password" required minLength={8} value={form.password} onChange={...} autoComplete={...} rightAddon={<PasswordToggleButton />} />` |

**Password toggle approach:** The new canonical `Input` does not have a built-in password toggle. Create an inline eye toggle using lucide-react:
```jsx
const [passwordVisible, setPasswordVisible] = useState(false);
// In JSX:
<Input
  label="Password"
  type={passwordVisible ? 'text' : 'password'}
  required
  minLength={8}
  value={form.password}
  onChange={(e) => setForm({...form, password: e.target.value})}
  autoComplete={isSignup ? 'new-password' : 'current-password'}
  rightAddon={
    <button type="button" onClick={() => setPasswordVisible(v => !v)} aria-label={passwordVisible ? 'Hide password' : 'Show password'}>
      {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  }
/>
```
Add `{ Eye, EyeOff }` to the lucide-react import.

| Line(s) | Old | New |
|---------|-----|-----|
| 82–84 | `<button className="button primary full" ...>{submitting ? 'Working...' : isSignup ? 'Create account' : 'Login'}</button>` | `<Button variant="primary" fullWidth disabled={submitting} type="submit">{submitting ? 'Working...' : isSignup ? 'Create account' : 'Login'}</Button>` |
| After line 94 | `</form>` | `</form></Card>` |

#### Expected Git Diff
- AuthPage.jsx: ~97→~115 lines (~+30/-12 lines)

---

### ResetPasswordPage.jsx

#### Imports to Remove
```jsx
import PasswordField from '../components/PasswordField.jsx';
```

#### Imports to Add
```jsx
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Eye, EyeOff } from 'lucide-react';
```

#### Replacements
| Line(s) | Old | New |
|---------|-----|-----|
| 32 | `<form className="auth-card" ...>` | `<Card variant="strong"><form ...>` |
| 37–42 | `<PasswordField label="New password" value={...} onChange={...} autoComplete="new-password" />` | Same password-toggle pattern as AuthPage |
| 44–46 | `<button className="button primary full" ...>Update password</button>` | `<Button variant="primary" fullWidth disabled={submitting} type="submit">{submitting ? 'Saving...' : 'Update password'}</Button>` |
| After line 48 | `</form>` | `</form></Card>` |

#### Expected Git Diff
- ResetPasswordPage.jsx: ~50→~60 lines (~+18/-8 lines)

---

### InvoiceDetailPage.jsx

#### Imports to Add
```jsx
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Select } from '../components/ui/Input.jsx';
```

#### Replacements

**Action buttons (lines 144–170):**
All `<button className="button ghost">` / `<button className="button danger">` / `<Link className="button ghost">` → canonical `<Button>` components:
```jsx
<div className="actions">
  {invoice.status === 'draft' && (
    <Button variant="ghost" onClick={markSent} leftIcon={<Send size={16} />}>
      Mark sent
    </Button>
  )}
  {invoice.status !== 'paid' && (
    <Button variant="ghost" onClick={markPaid} leftIcon={<Check... />}>
      Mark paid
    </Button>
  )}
  <Button variant="ghost" onClick={duplicateCurrentInvoice} leftIcon={<Copy size={16} />}>
    Duplicate
  </Button>
  <Button variant="ghost" onClick={() => exportInvoicePdf(invoice, profile).catch(...)} leftIcon={<Download size={16} />}>
    PDF
  </Button>
  <Button as={Link} variant="ghost" to={`/app/invoices/${id}/edit`} leftIcon={<Edit size={16} />}>
    Edit
  </Button>
  <Button variant="danger" onClick={handleDelete} leftIcon={<Trash2 size={16} />}>
    Delete
  </Button>
</div>
```

**Invoice preview panel (line 174):**
`<section className="invoice-preview panel">` → `<Card variant="default" className="invoice-preview">`

**Payment form (lines 243–280):**
All `<label><input ... /></label>` patterns → `<Input label="..." />`:
```jsx
<Input label="Amount" type="number" required min="0.01" step="0.01" value={payment.amount} onChange={...} />
<Input label="Date" type="date" required value={payment.payment_date} onChange={...} />
<Select label="Method" value={payment.method} onChange={...} options={[...]} />
<Input label="Reference" value={payment.reference} onChange={...} />
<Input label="Notes" value={payment.notes} onChange={...} className="span-2" />
<Button variant="primary" disabled={savingPayment} type="submit">
  {savingPayment ? 'Recording...' : 'Record payment'}
</Button>
```

**Payments section (line 236):**
`<section className="panel">` → `<Card variant="default">`
`<button className="button small danger">` → `<Button variant="danger" size="sm">`

**Upgrade inline buttons (lines 288–290):**
`<button className="button primary">` → `<Button variant="primary">`

**Payment table (lines 297–324):**
The raw `<table>` for payments should remain as-is (it's a manually rendered table, not using canonical `Table`). But the `<div className="table-wrap">` wrapper can stay.

#### Expected Git Diff
- InvoiceDetailPage.jsx: ~334→~360 lines (~+55/-29 lines)

---

### InvoiceFormPage.jsx

#### Imports to Add
```jsx
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
```

#### Replacements

**Form container (line 146):**
`<form className="panel form-grid" ...>` → `<Card variant="default"><form className="form-grid" ...>`

**Form fields:**
All `<label>...<input ... /></label>`, `<label>...<select ... /></label>`, `<label>...<textarea ... /></label>` patterns → canonical `<Input>`, `<Select>`, `<Textarea>`:

| Line(s) | Old | New |
|---------|-----|-----|
| 148–151 | `<label>Invoice number<input ... /></label>` | `<Input label="Invoice number" required value={form.invoice_number} onChange={...} />` |
| 152–162 | `<label>Client<select ...>...</select></label>` | `<Select label="Client" required value={form.client_id} onChange={...} options={clients.map(...)} />` |
| 163–166 | `<label>Invoice date<input type="date" ... /></label>` | `<Input label="Invoice date" type="date" required value={form.invoice_date} onChange={...} />` |
| 167–170 | `<label>Due date<input type="date" ... /></label>` | `<Input label="Due date" type="date" required value={form.due_date} onChange={...} />` |
| 171–180 | `<label>Currency<select ...>...</select></label>` | `<Select label="Currency" value={form.currency} onChange={...} options={CURRENCIES.map(c => ({value:c, label:c}))} />` |
| 181–190 | `<label>Status<select ...>...</select></label>` | `<Select label="Status" value={form.status} onChange={...} options={INVOICE_STATUSES.map(s => ({value:s, label:s}))} />` |
| 191–200 | `<label>Discount<input type="number" ... /></label>` | `<Input label="Discount" type="number" min="0" step="0.01" value={form.discount_total} onChange={...} />` |
| 201–204 | `<label className="span-2">Notes<textarea ... /></label>` | `<Textarea label="Notes" rows={4} className="span-2" value={form.notes} onChange={...} />` |

**Items editor buttons (line 209):**
`<button type="button" className="button ghost small" onClick={addItem}>` → `<Button variant="ghost" size="sm" type="button" onClick={addItem} leftIcon={<Plus size={15} />}>Add item</Button>`

**Item row form fields (lines 216–255):**
Same pattern: `<label>Description<input ... /></label>` → `<Input label="Description" required ... />` for each field.

**Form action buttons (lines 271–276):**
```jsx
<Button as={Link} variant="ghost" to="/app/invoices">Cancel</Button>
<Button variant="primary" disabled={saving} type="submit">
  {saving ? 'Saving...' : 'Save invoice'}
</Button>
```

**Close Card:** `</form></Card>`

#### Expected Git Diff
- InvoiceFormPage.jsx: ~286→~330 lines (~+75/-31 lines)

---

### ProposalFormPage.jsx

#### Imports to Add
```jsx
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
```

#### Replacements
Same form field migration pattern as InvoiceFormPage:

| Old | New |
|-----|-----|
| `<form className="panel form-grid" ...>` | `<Card variant="default"><form className="form-grid" ...>` |
| `<label>Template<select ...>...</select></label>` | `<Select label="Template" value={template} onChange={...} options={Object.keys(templates).map(n => ({value:n, label:n}))} />` |
| `<label>Client name<input ... /></label>` | `<Input label="Client name" required value={form.client_name} onChange={...} />` |
| `<label className="span-2">Proposal title<input ... /></label>` | `<Input label="Proposal title" required className="span-2" value={form.title} onChange={...} />` |
| `<label className="span-2">Project details<textarea ... /></label>` | `<Textarea label="Project details" required rows={4} className="span-2" value={form.project_summary} onChange={...} />` |
| `<label className="span-2">Scope<textarea ... /></label>` | `<Textarea label="Scope" required rows={5} className="span-2" value={form.scope} onChange={...} />` |
| `<label>Timeline<input ... /></label>` | `<Input label="Timeline" required value={form.timeline} onChange={...} />` |
| `<label>Currency<select ...>...</select></label>` | `<Select label="Currency" value={form.currency} onChange={...} options={CURRENCIES.map(c => ({value:c, label:c}))} />` |

**Add item button:**
`<button type="button" className="button ghost small" ...>` → `<Button variant="ghost" size="sm" type="button" ...>`

**Form actions:**
```jsx
<Button as={Link} variant="ghost" to="/app/proposals">Cancel</Button>
<Button variant="ghost" type="button" onClick={exportDraft} leftIcon={<Download size={16} />}>
  Export PDF
</Button>
<Button variant="primary" disabled={saving} type="submit">
  {saving ? 'Saving...' : 'Save proposal'}
</Button>
```

**Close Card:** `</form></Card>`

#### Expected Git Diff
- ProposalFormPage.jsx: ~252→~280 lines (~+50/-22 lines)

---

### SettingsPage.jsx

#### Imports to Add
```jsx
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Badge } from '../components/ui/Badge.jsx';
```

#### Imports to Remove
None (no legacy component imports — only `FeatureGate` which stays).

#### Replacements

**Main form (line 175):**
`<form className="panel form-grid" ...>` → `<Card variant="default"><form className="form-grid" ...>`

**Form fields (lines 189–230):**
All `<label>Name<input ... /></label>` patterns → canonical `<Input label="Name" ... />`:
- Name, Business name, Email, Phone, Country → `<Input>`
- Default currency → `<Select>`
- Address → `<Textarea>`
- Invoice prefix → `<Input>`
- Payment instructions → `<Textarea>`

**Avatar section (lines 177–188):**
Replace raw avatar rendering with canonical `<Avatar>`:
```jsx
<Avatar
  src={form.avatar_url}
  name={form.full_name}
  size="lg"
/>
<Button variant="ghost" size="sm" onClick={...} leftIcon={<Upload size={16} />}>
  {uploadingAvatar ? 'Uploading...' : 'Upload avatar'}
</Button>
```

**Branding section (lines 232–251):**
Logo placeholder replacement:
```jsx
{form.logo_url ? <img src={form.logo_url} alt="Business logo" /> : <LogoPlaceholder />}
```

Invoice brand color → `<Input type="color">` (not canonical, but Input supports `type="color"`).

**Form actions (lines 253–257):**
```jsx
<Button variant="primary" disabled={saving} type="submit">
  {saving ? 'Saving...' : 'Save settings'}
</Button>
```

**Close Card:** `</form></Card>`

**Subscription section (line 260):**
`<section className="panel">` → `<Card variant="default">`
`<button className="button ghost" ...>` → `<Button variant="ghost" ...>`
Upgrade buttons (lines 293–299):
```jsx
<Button variant="primary" onClick={() => checkout('pro_monthly')} disabled={Boolean(billingAction)}>
  {billingAction === 'pro_monthly' ? 'Opening...' : 'Upgrade monthly'}
</Button>
<Button variant="ghost" onClick={() => checkout('pro_yearly')} disabled={Boolean(billingAction)}>
  {billingAction === 'pro_yearly' ? 'Opening...' : 'Upgrade yearly'}
</Button>
```

#### Expected Git Diff
- SettingsPage.jsx: ~304→~340 lines (~+65/-29 lines)

---

### PR 8 Summary

| File | Old Lines | New Lines | Δ |
|------|-----------|-----------|---|
| SettingsPage.jsx | 304 | ~340 | +36 |
| AuthPage.jsx | 97 | ~115 | +18 |
| ResetPasswordPage.jsx | 50 | ~60 | +10 |
| InvoiceFormPage.jsx | 286 | ~330 | +44 |
| InvoiceDetailPage.jsx | 334 | ~360 | +26 |
| ProposalFormPage.jsx | 252 | ~280 | +28 |
| PasswordField.jsx | 30 | 0 | -30 |
| **Total** | **1353** | **~1485** | **+132 lines** |

### Manual Verification Checklist
- [ ] SettingsPage: all 12 form fields render, save persists, avatar upload works, branding section shows FeatureGate, upgrade buttons work
- [ ] AuthPage: login and signup forms use canonical Input, password toggle works via rightAddon
- [ ] ResetPasswordPage: password field uses canonical Input with eye toggle
- [ ] InvoiceFormPage: line items editor functional, all form fields canonical, save creates invoice
- [ ] InvoiceDetailPage: action buttons canonical, payment form uses Input/Select, upgrade modal shown for Free users
- [ ] ProposalFormPage: template selector works, items editor functional, export PDF + save proposal buttons canonical
- [ ] PasswordField.jsx deleted — zero import references

### Build Verification
```bash
npm run build
```
Must exit with code 0.

### Rollback
```bash
git checkout HEAD -- frontend/src/pages/SettingsPage.jsx frontend/src/pages/AuthPage.jsx frontend/src/pages/ResetPasswordPage.jsx frontend/src/pages/InvoiceFormPage.jsx frontend/src/pages/InvoiceDetailPage.jsx frontend/src/pages/ProposalFormPage.jsx
git checkout HEAD -- frontend/src/components/PasswordField.jsx
```

---

## PR 9 — Final Cleanup & Legacy Component Deletion

### Files Deleted (all legacy components still remaining)
At this point, all legacy components should have zero import references. Verify and delete:

| File | Status (expected after PR 8) |
|------|------------------------------|
| `frontend/src/components/Button.jsx` | Should have been deleted in PR 5 |
| `frontend/src/components/Modal.jsx` | Should have been deleted in PR 5 |
| `frontend/src/components/PricingCard.jsx` | Should have been deleted in PR 5 |
| `frontend/src/components/StatusBadge.jsx` | Should have been deleted in PR 4 |
| `frontend/src/components/EmptyState.jsx` | Should have been deleted in PR 4 |
| `frontend/src/components/LoadingSpinner.jsx` | Should have been deleted in PR 4 |
| `frontend/src/components/StatCard.jsx` | Should have been deleted in PR 1 |
| `frontend/src/components/Input.jsx` | Should have been deleted in PR 1 |
| `frontend/src/components/Table.jsx` | Should have been deleted in PR 1 |
| `frontend/src/components/Card.jsx` | Should have been deleted in PR 1 |
| `frontend/src/components/PasswordField.jsx` | Should have been deleted in PR 8 |

### Files That Stay in `components/`
| File | Purpose | Status |
|------|---------|--------|
| `frontend/src/components/AppLayout.jsx` | Layout orchestration (sidebar + topbar + content) | Already uses `ui/` components |
| `frontend/src/components/PublicLayout.jsx` | Marketing layout shell | Already uses `ui/` components |
| `frontend/src/components/ProtectedRoute.jsx` | Auth guard (no UI) | No component deps |
| `frontend/src/components/UpgradeModal.jsx` | Upgrade modal (migrated in PR 5) | Uses canonical components |
| `frontend/src/components/FeatureGate.jsx` | Feature gate wrapper (migrated in PR 4) | Uses canonical components |

### Verification Command
```bash
grep -rn "from.*'\.\./components/[A-Z]" frontend/src/ --include="*.{jsx,js}" | grep -v "ui/" | grep -v "AppLayout\|PublicLayout\|ProtectedRoute\|UpgradeModal\|FeatureGate"
```
Must return zero matches.

### Expected Git Diff
- Files deleted: ~100+ lines total (depends on which files survived from earlier PRs)

### Manual Verification Checklist
- [ ] `frontend/src/components/` contains only: `AppLayout.jsx`, `PublicLayout.jsx`, `ProtectedRoute.jsx`, `UpgradeModal.jsx`, `FeatureGate.jsx`, `ui/` (subdirectory)
- [ ] All legacy `.jsx` files removed
- [ ] Global grep confirms zero imports from legacy paths

### Build Verification
```bash
npm run build
```
Must exit with code 0.

### Rollback
```bash
git checkout HEAD -- frontend/src/components/
```

---

## PR 10 — Migration Status Appendix Update

### Files Modified (1)
- `PROJECT_STATUS.md` (or `EMBER_DESIGN_BIBLE.md` section 17)

### Update Action
Change all rows in section 17 (Migration Status Appendix) from `⏳ Legacy` / `🔄 In Progress` to `✅ Complete`.

### Specific Changes
```
| SettingsPage         | ✅ Complete | Forms, branding, billing, usage — all canonical |
| InvoiceFormPage      | ✅ Complete | Line items editor fully migrated |
| InvoiceDetailPage    | ✅ Complete | Read-only detail, PDF actions |
| ClientFormPage       | ✅ Complete | Create/edit client |
| ClientDetailPage     | ✅ Complete | Client detail + related invoices |
| ProposalsPage        | ✅ Complete | Proposal list |
| ProposalFormPage     | ✅ Complete | Proposal editor |
| LandingPage          | ✅ Complete | Marketing hero, features, testimonials |
| PricingPage          | ✅ Complete | Comparison cards, checkout CTAs |
| FeaturesPage         | ✅ Complete | Feature detail grid |
| AuthPage             | ✅ Complete | Login/signup forms |
| ForgotPasswordPage   | ✅ Complete | Auth form |
| ResetPasswordPage    | ✅ Complete | Auth form |
| Legal Pages (4)      | ✅ Complete | Static content |
```

### Expected Git Diff
- PROJECT_STATUS.md / EMBER_DESIGN_BIBLE.md: ~20 lines changed (status updates only)

### Manual Verification Checklist
- [ ] All 18 screens marked `✅ Complete`
- [ ] Notes column reflects final migration description

### Build Verification
```bash
npm run build
```
Must exit with code 0 (documentation only, but no surprises).

### Rollback
```bash
git checkout HEAD -- PROJECT_STATUS.md EMBER_DESIGN_BIBLE.md
```

---

## Dependency Graph Summary

```
                          PR 1 (dead code)
                              |
                          PR 2 (Dashboard CSS)
                              |
                          PR 3 (Invoices + Clients CSS)
                              |
                          PR 4 (StatusBadge, EmptyState, Spinner)
                           /  \
                          /    \
                      PR 5    PR 6 (UpgradeModal + FeatureGate)
                   (Button,    [depends on PR 4 + PR 5]
                    Modal,
                    PricingCard)
                          \    /
                           \  /
                          PR 7 (5 independent pages)
                              |
                          PR 8 (6 complex pages + PasswordField delete)
                              |
                          PR 9 (final cleanup)
                              |
                          PR 10 (docs update)
```

## Critical Risk Note — SettingsPage

SettingsPage imports `FeatureGate` (which itself imports `UpgradeModal`, migrated in PR 5). SettingsPage is the most complex form in the app with:
- 12 form fields (`Input`, `Select`, `Textarea`)
- Avatar upload (canonical `Avatar` replacement)
- Logo upload + branding section (gated by `FeatureGate`)
- Subscription section (upgrade buttons, usage meters)
- Color picker for invoice brand color

**Recommended safety step:** Before PR 8, run `npm run build` with PR 7 merged to confirm the app builds cleanly with all 5 independent pages migrated.

## Rollback Protocol (all PRs)

If any PR causes a production regression:

1. **Immediate:** `git revert HEAD` or restore specific files via `git checkout HEAD -- <file>`
2. **Root cause analysis:** Identify whether issue was prop mapping error, missing import, or API mismatch
3. **Re-apply with fix:** Create new PR with corrected migration, test on staging first

---

*End of Document*
