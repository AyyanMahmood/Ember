# EmberFlow Migration Plan

**Authority:** EMBER_DESIGN_BIBLE.md (canonical design specification)  
**Status:** Approved for execution — not yet started  
**Last Updated:** 2026-07-18

---

## Reference: Canonical Component API Mapping

Every migration replaces legacy imports with canonical equivalents from `components/ui/`.

| Legacy Component | Legacy Import | Canonical Import | Breaking Change |
|---|---|---|---|
| `Button` | `from '../components/Button.jsx'` | `{ Button } from '../components/ui/Button.jsx'` | Default variant changes from `ghost` to `primary`; size values change from empty/`small`/`large` to `sm`/`md`/`lg` |
| `Card` | `from '../components/Card.jsx'` | `{ Card } from '../components/ui/Card.jsx'` | No variant support in legacy; must specify `variant="default"` to match |
| `StatCard` | `from '../components/StatCard.jsx'` | `{ StatCard } from '../components/ui/Card.jsx'` | New StatCard supports `trend` and `trendLabel` props |
| `Table` | `from '../components/Table.jsx'` | `{ Table } from '../components/ui/Table.jsx'` | Prop changes: `columns` becomes array of objects with `{key,label,align?,width?,sortable?,render?}`; `rows` becomes `data`; `getRowKey` becomes `keyExtractor` |
| `Modal` | `from '../components/Modal.jsx'` | `{ Modal } from '../components/ui/Modal.jsx'` | `open` prop renamed to `isOpen`; adds `size`, `showCloseButton`, `closeOnOverlayClick`, `closeOnEscape` |
| `EmptyState` | `from '../components/EmptyState.jsx'` | `{ EmptyState } from '../components/ui/EmptyState.jsx'` | Adds `icon`, `actionHref`, `actionOnClick`, `variant`, `children` props |
| `StatusBadge` | `from '../components/StatusBadge.jsx'` | `{ StatusBadge } from '../components/ui/Badge.jsx'` | **Breaking**: `invoice` prop removed — use `status` prop instead. `invoice={row}` → `status={effectiveStatus(row)}` |
| `LoadingSpinner` | `from '../components/LoadingSpinner.jsx'` | `{ LoadingSpinner } from '../components/ui/Loading.jsx'` | Adds `size` (`xs`/`sm`/`md`/`lg`/`xl`) and `aria-label` props |
| `PricingCard` | `from '../components/PricingCard.jsx'` | `{ PricingCard } from '../components/ui/Card.jsx'` | Different prop shapes — new one expects `name`, `price`, `period`, `features`, `highlight`, `cta` |
| `Input` | `from '../components/Input.jsx'` | `{ Input } from '../components/ui/Input.jsx'` | Legacy uses `<label>` wrapping; new uses `<label htmlFor>` linked pattern; adds `label`, `error`, `hint`, `leftAddon`, `rightAddon` |
| `PasswordField` | `from '../components/PasswordField.jsx'` | `{ Input } from '../components/ui/Input.jsx'` | No direct replacement — `Input` with `type="password"` + rightAddon for eye toggle |
| `FeatureGate` | `from '../components/FeatureGate.jsx'` | `{ useSubscription().canUseFeature }` | Not a drop-in replacement — gate content instead of wrapping page |

---

## PR 1 — Dead Code Removal & Quick Wins

### Objective
Remove `styles.css` (confirmed dead, zero imports), delete unused legacy components that have no remaining references, and remove debug console.logs.

### Evidence
- `styles.css`: Zero grep matches for `import.*styles\.css` or `<link.*styles\.css` across all `.jsx`, `.js`, `.html` files. Only `styles/index.css` is imported in `main.jsx`.
- `StatCard.jsx` (legacy): Zero import references across all pages.
- `Input.jsx` (legacy): Zero import references across all pages.
- `Table.jsx` (legacy): Zero import references across all pages.
- `Card.jsx` (legacy): Zero import references across all pages.

### Files Deleted
- `frontend/src/styles.css` (1339 lines, dead)
- `frontend/src/components/StatCard.jsx`
- `frontend/src/components/Input.jsx`
- `frontend/src/components/Table.jsx`
- `frontend/src/components/Card.jsx`

### Files Modified
- `frontend/src/services/supabase.js` — remove lines 3-5 (`console.log` statements)

### Components Affected
None — all deleted components have zero runtime references.

### Breaking Changes
None.

### Risk Level
**Very Low** — deletion of dead files only.

### Estimated Time
15 minutes.

### Rollback Strategy
Restore deleted files from git (`git checkout -- <file>`).

### Validation Checklist
- [ ] `grep -rn "StatCard\|Input\|Table\|Card" frontend/src/pages/ --include="*.jsx"` returns zero matches for legacy import paths
- [ ] `grep -rn "styles\.css" frontend/ --include="*.{jsx,js,html}"` returns zero matches
- [ ] `frontend/src/services/supabase.js` has no `console.log` lines

### npm Build Verification
```bash
npm run build
```
Must exit with code 0.

### Manual UI Verification
- Open `/app/dashboard` — page renders without style regression
- Open `/app/clients` — page renders without style regression
- Open `/app/invoices` — page renders without style regression

---

## PR 2 — DashboardPage CSS Class Cleanup

### Objective
Eliminate all raw CSS class usage in DashboardPage. Replace `className="button button--primary"` with canonical `<Button>` component.

### Files Modified
- `frontend/src/pages/DashboardPage.jsx`

### Components Affected
- `DashboardPage`

### Breaking Changes
None — visual output identical.

### Risk Level
**Low** — single-page change, no shared component impact.

### Estimated Time
30 minutes.

### Rollback Strategy
`git checkout HEAD -- frontend/src/pages/DashboardPage.jsx`

### Validation Checklist
- [ ] All `className="button"` patterns replaced with `<Button>` component
- [ ] All `className="button--*"` patterns mapped to `variant="*"` and `size="*"`
- [ ] No remaining raw CSS class names for buttons in DashboardPage
- [ ] Button variants match original visual output (consult EMBER_DESIGN_BIBLE.md §8.1)

### npm Build Verification
```bash
npm run build
```
Must exit with code 0.

### Manual UI Verification
- Open `/app/` (DashboardPage)
- Click "New invoice" link — navigates to `/app/invoices/new`
- Verify button visual matches canonical `Button` styling (primary variant, md size)
- Verify StatCard grid renders correctly
- Verify Recent invoices table renders

---

## PR 3 — InvoicesPage & ClientsPage CSS Class Cleanup

### Objective
Eliminate raw CSS class usage in InvoicesPage and ClientsPage. Remove duplicate local `EmptyStateIllustration` in ClientsPage.

### Files Modified
- `frontend/src/pages/InvoicesPage.jsx`
- `frontend/src/pages/ClientsPage.jsx`

### Components Affected
- `InvoicesPage`
- `ClientsPage`

### Breaking Changes
None — visual output identical.

### Risk Level
**Low** — two independent page changes.

### Estimated Time
30 minutes.

### Rollback Strategy
`git checkout HEAD -- frontend/src/pages/InvoicesPage.jsx frontend/src/pages/ClientsPage.jsx`

### Validation Checklist
- [ ] InvoicesPage: all `className="button button--ghost button--sm"` replaced with `<Button variant="ghost" size="sm">`
- [ ] ClientsPage: all `className="button button--ghost button--sm"` replaced with `<Button variant="ghost" size="sm">`
- [ ] ClientsPage: local `EmptyStateIllustration` function removed, replaced with import from `../components/ui/EmptyState.jsx`

### npm Build Verification
```bash
npm run build
```
Must exit with code 0.

### Manual UI Verification
- Open `/app/invoices` — verify "View" action buttons render as ghost sm
- Open `/app/clients` — verify Edit/Delete action buttons render as ghost sm
- Open `/app/clients` — search/filter inputs function correctly
- Verify empty state shows correct illustration when no clients

---

## PR 4 — StatusBadge & EmptyState & LoadingSpinner Legacy Replacement

### Objective
Delete three legacy leaf components and update their consumers. These are leaf nodes in the dependency graph — no other legacy components depend on them.

### Evidence
- `StatusBadge.jsx` (legacy): Only imported by `InvoiceDetailPage.jsx`
- `EmptyState.jsx` (legacy): Only imported by `ProposalsPage.jsx`
- `LoadingSpinner.jsx` (legacy): Only imported by `FeatureGate.jsx`

### Files Deleted
- `frontend/src/components/StatusBadge.jsx`
- `frontend/src/components/EmptyState.jsx`
- `frontend/src/components/LoadingSpinner.jsx`

### Files Modified
- `frontend/src/pages/InvoiceDetailPage.jsx` — replace legacy `StatusBadge` import with `StatusBadge` from `../components/ui/Badge.jsx`; change prop from `invoice={row}` to `status={effectiveStatus(row)}`
- `frontend/src/pages/ProposalsPage.jsx` — replace legacy `EmptyState` import with `EmptyState` from `../components/ui/EmptyState.jsx`
- `frontend/src/components/FeatureGate.jsx` — replace legacy `LoadingSpinner` import with `LoadingSpinner` from `../components/ui/Loading.jsx`

### Components Affected
- `InvoiceDetailPage`
- `ProposalsPage`
- `FeatureGate` (legacy — remains until PR 6)

### Breaking Changes
- `StatusBadge` prop change: `invoice` → `status`. Callers must pre-compute the status string.

### Risk Level
**Medium** — prop API change in StatusBadge requires careful mapping. EmptyState and LoadingSpinner are drop-in replacements.

### Estimated Time
1 hour.

### Rollback Strategy
`git checkout HEAD -- frontend/src/pages/InvoiceDetailPage.jsx frontend/src/pages/ProposalsPage.jsx frontend/src/components/FeatureGate.jsx`; restore deleted files via `git checkout HEAD -- frontend/src/components/StatusBadge.jsx frontend/src/components/EmptyState.jsx frontend/src/components/LoadingSpinner.jsx`

### Validation Checklist
- [ ] InvoiceDetailPage: `effectiveStatus(invoice)` used to produce status string for `<StatusBadge status={...} />`
- [ ] ProposalsPage: `EmptyState` uses canonical props (`title`, `message`, `actionLabel`, `actionTo`)
- [ ] FeatureGate: `LoadingSpinner` uses canonical props (`size`, `label`)
- [ ] All three legacy components confirmed deleted after successful build

### npm Build Verification
```bash
npm run build
```
Must exit with code 0. (This confirms no dangling import references.)

### Manual UI Verification
- Open `/app/invoices/:id` (paid invoice) — verify badge shows "Paid" in green
- Open `/app/invoices/:id` (overdue invoice) — verify badge shows "Overdue" in red
- Open `/app/invoices/:id` (draft invoice) — verify badge shows "Draft" in neutral
- Open `/app/proposals` — verify empty state renders with illustration and CTA button
- Open a Pro-gated page as Free user — verify loading spinner appears during plan check

---

## PR 5 — Button, Modal, PricingCard Legacy Chain Removal

### Objective
Delete three legacy components that form a dependency chain: `Button` ← `PricingCard` ← `UpgradeModal`. Replace internal references with canonical equivalents from `components/ui/`.

### Evidence
- `Button.jsx` (legacy): Only imported by `PricingCard.jsx` (legacy)
- `Modal.jsx` (legacy): Only imported by `UpgradeModal.jsx` (legacy)
- `PricingCard.jsx` (legacy): Imported by `UpgradeModal.jsx` (legacy), `PricingPage.jsx`, `LandingPage.jsx`

### Files Deleted
- `frontend/src/components/Button.jsx`
- `frontend/src/components/Modal.jsx`
- `frontend/src/components/PricingCard.jsx`

### Files Modified
- `frontend/src/components/UpgradeModal.jsx` — replace `Modal` (legacy) with `Modal` from `ui/` (`open` → `isOpen`); replace `PricingCard` (legacy) with `PricingCard` from `ui/`; replace `Button` (legacy) with `Button` from `ui/`
- `frontend/src/pages/PricingPage.jsx` — replace `PricingCard` (legacy) with `PricingCard` from `../components/ui/Card.jsx`
- `frontend/src/pages/LandingPage.jsx` — replace `PricingCard` (legacy) with `PricingCard` from `../components/ui/Card.jsx`

### Components Affected
- `UpgradeModal`
- `PricingPage`
- `LandingPage`

### Breaking Changes
- `Modal` prop: `open` → `isOpen` in `UpgradeModal`
- `PricingCard` API completely different: legacy uses `plan` object with `name/price/cadence/features`; canonical uses separate `name`, `price`, `period`, `features`, `highlight`, `cta` props

### Risk Level
**Medium-High** — PricingCard API change is significant. Requires careful prop mapping in UpgradeModal, PricingPage, and LandingPage.

### Estimated Time
1.5 hours.

### Rollback Strategy
`git checkout HEAD -- frontend/src/components/UpgradeModal.jsx frontend/src/pages/PricingPage.jsx frontend/src/pages/LandingPage.jsx`; restore deleted files via `git checkout HEAD -- frontend/src/components/Button.jsx frontend/src/components/Modal.jsx frontend/src/components/PricingCard.jsx`

### Validation Checklist
- [ ] UpgradeModal: `open` → `isOpen` in `<Modal>`
- [ ] PricingPage: `PricingCard` uses canonical `name`, `price`, `period`, `features`, `highlight`, `cta` props
- [ ] LandingPage: `PricingCard` uses canonical props
- [ ] UpgradeModal: Checkout functions still work — `startCheckout(plan)` call preserved
- [ ] All three legacy components confirmed deleted after successful build

### npm Build Verification
```bash
npm run build
```
Must exit with code 0.

### Manual UI Verification
- Open `/pricing` — verify pricing cards render monthly/yearly, CTA buttons function
- Open `/` (landing) — verify pricing teaser section renders
- Click "Upgrade to Pro" from any page — verify UpgradeModal opens with correct layout
- Verify both "Upgrade monthly" and "Upgrade yearly" buttons call `startCheckout()`

---

## PR 6 — UpgradeModal & FeatureGate Full Migration

### Objective
Complete the migration of UpgradeModal and FeatureGate. At this point, no legacy components remain as runtime dependencies. This PR unlocks 7 legacy pages simultaneously.

### Evidence
- `UpgradeModal.jsx` (legacy): Imported by `InvoiceDetailPage.jsx`, `InvoiceFormPage.jsx`
- `FeatureGate.jsx` (legacy): Imported by `SettingsPage.jsx`, `AnalyticsPage.jsx`, `ProposalsPage.jsx`, `ProposalFormPage.jsx`

### Files Modified
- `frontend/src/components/UpgradeModal.jsx` — full migration: use canonical Modal, PricingCard, Button
- `frontend/src/components/FeatureGate.jsx` — replace `UpgradeModal` import with migrated version; use `LoadingSpinner` from `ui/`

### Components Affected
- `UpgradeModal`
- `FeatureGate`
- `SettingsPage`
- `AnalyticsPage`
- `ProposalsPage`
- `ProposalFormPage`
- `InvoiceDetailPage`
- `InvoiceFormPage`

(All 8 pages depend on either UpgradeModal or FeatureGate; none need individual changes in this PR.)

### Breaking Changes
None — internal refactor only. Public APIs of `UpgradeModal` and `FeatureGate` remain unchanged (`open`/`onClose`/`reason` for UpgradeModal; `feature`/`title`/`message`/`children` for FeatureGate).

### Risk Level
**Medium** — two files modified, 8 pages indirectly affected. Highest blast radius so far.

### Estimated Time
1 hour.

### Rollback Strategy
`git checkout HEAD -- frontend/src/components/UpgradeModal.jsx frontend/src/components/FeatureGate.jsx`

### Validation Checklist
- [ ] UpgradeModal: `open` → `isOpen` for `<Modal>`
- [ ] UpgradeModal: PricingCard uses canonical prop shape
- [ ] FeatureGate: `LoadingSpinner` uses canonical import from `ui/`
- [ ] FeatureGate: `UpgradeModal` imported from local file (no path change)
- [ ] All 8 pages compile without errors

### npm Build Verification
```bash
npm run build
```
Must exit with code 0.

### Manual UI Verification
- Open `/app/settings` as Free user — verify FeatureGate shows upgrade prompt
- Open `/app/analytics` as Free user — verify FeatureGate shows upgrade prompt
- Open `/app/invoices/new` as Free user exceeding limit — verify UpgradeModal opens
- Open `/app/invoices/:id` — click "Record payment" — verify UpgradeModal opens
- Open `/app/proposals` — verify FeatureGate wraps content correctly
- Verify all UpgradeModal checkout buttons call `startCheckout()` correctly

---

## PR 7 — Mass Page Migration: Independent Pages

### Objective
Migrate all pages that only use raw CSS classes (no legacy component imports). These are independent — no dependency graph concerns.

### Pages Migrated (in order)
1. `ClientFormPage` — replace `className="panel"` → `<Card>`, `className="button *"` → `<Button>`
2. `ClientDetailPage` — replace `className="panel"` → `<Card>`, `className="button *"` → `<Button>`
3. `ForgotPasswordPage` — replace `className="button primary full"` → `<Button variant="primary" fullWidth>`, `auth-card` → `<Card>`
4. `FeaturesPage` — replace feature-grid CSS with `<Card variant="default">` + `<FeatureCard>` where applicable
5. `ContactPage` — replace `className="button primary"` → `<Button variant="primary">`

### Files Modified
- `frontend/src/pages/ClientFormPage.jsx`
- `frontend/src/pages/ClientDetailPage.jsx`
- `frontend/src/pages/ForgotPasswordPage.jsx`
- `frontend/src/pages/FeaturesPage.jsx`
- `frontend/src/pages/ContactPage.jsx`

### Components Affected
- All 5 pages above.

### Breaking Changes
None — each page is independent.

### Risk Level
**Low** — each page compiles independently, no shared dependencies.

### Estimated Time
2 hours (5 pages × ~25 min each).

### Rollback Strategy
`git checkout HEAD -- frontend/src/pages/ClientFormPage.jsx frontend/src/pages/ClientDetailPage.jsx frontend/src/pages/ForgotPasswordPage.jsx frontend/src/pages/FeaturesPage.jsx frontend/src/pages/ContactPage.jsx`

### Validation Checklist
- [ ] ClientFormPage: `className="panel"` → `<Card variant="default">`, labels use canonical `<Input label="..." />`
- [ ] ClientDetailPage: detail panels use `<Card>`, action buttons use `<Button>`
- [ ] ForgotPasswordPage: `auth-card` → `<Card>`, `button primary full` → `<Button variant="primary" fullWidth>`
- [ ] FeaturesPage: feature articles → `<Card variant="default">` or `<FeatureCard>`
- [ ] ContactPage: contact buttons → `<Button variant="primary">`
- [ ] All 5 pages: zero raw CSS class names for buttons, cards, inputs

### npm Build Verification
```bash
npm run build
```
Must exit with code 0.

### Manual UI Verification
- Open `/app/clients/new` — form renders, save creates client
- Open `/app/clients/:id` — contact info + invoices list renders
- Open `/forgot-password` — form renders, submit triggers password reset email
- Open `/features` — feature grid renders
- Open `/contact` — contact cards render, email link works

---

## PR 8 — Auth Pages & SettingsPage Final Migration

### Objective
Migrate the remaining legacy pages: SettingsPage (most complex form), AuthPage, ResetPasswordPage, ProposalFormPage, InvoiceFormPage, InvoiceDetailPage. These pages either use `PasswordField` (legacy) or are complex forms requiring careful migration.

### Files Modified
- `frontend/src/pages/SettingsPage.jsx`
- `frontend/src/pages/AuthPage.jsx`
- `frontend/src/pages/ResetPasswordPage.jsx`
- `frontend/src/pages/InvoiceFormPage.jsx`
- `frontend/src/pages/InvoiceDetailPage.jsx`
- `frontend/src/pages/ProposalFormPage.jsx`

### Files Deleted
- `frontend/src/components/PasswordField.jsx` (only imported by AuthPage and ResetPasswordPage — both migrated in this PR)
- `frontend/src/components/FeatureGate.jsx` (replace with inline `useSubscription().canUseFeature()` logic or keep as-is if complete migration is preferred)
- `frontend/src/components/UpgradeModal.jsx` (replace with `Modal` from `ui/` composed inline, or keep migrated version)
- `frontend/src/components/AppLayout.jsx` (already uses `ui/` components — verify no legacy deps remain)

### Components Affected
- `SettingsPage`
- `AuthPage`
- `ResetPasswordPage`
- `InvoiceFormPage`
- `InvoiceDetailPage`
- `ProposalFormPage`
- `PasswordField` (deleted)

### Breaking Changes
- `PasswordField` deleted — AuthPage and ResetPasswordPage now use `Input` with `type="password"` + eye toggle via rightAddon
- SettingsPage: complete form migration from raw `label > input` pattern to `<Input label="..." />` with `leftAddon`/`rightAddon` (but visual output identical)

### Risk Level
**High** — SettingsPage is the most complex form (12 fields, avatar upload, branding section, subscription section). InvoiceFormPage has the line items editor. These are the highest-risk migrations.

### Estimated Time
4 hours (SettingsPage: 2h, InvoiceFormPage: 1h, AuthPage + ResetPasswordPage: 30min, ProposalFormPage: 30min).

### Rollback Strategy
```bash
git checkout HEAD -- frontend/src/pages/SettingsPage.jsx frontend/src/pages/AuthPage.jsx frontend/src/pages/ResetPasswordPage.jsx frontend/src/pages/InvoiceFormPage.jsx frontend/src/pages/InvoiceDetailPage.jsx frontend/src/pages/ProposalFormPage.jsx
git checkout HEAD -- frontend/src/components/PasswordField.jsx
```

### Validation Checklist
- [ ] SettingsPage: 12 form fields migrated to `<Input>`, `<Select>`, `<Textarea>`, `<Button>`, `<Card>`, `<Avatar>`
- [ ] AuthPage: login/signup forms use canonical `<Input>`, `<Button>`; password toggle uses rightAddon
- [ ] ResetPasswordPage: password fields use canonical `<Input>` with eye toggle
- [ ] InvoiceFormPage: line items editor uses canonical `<Input>`, `<Button>`, `<Table>`; discount/notes fields use `<Input>`
- [ ] InvoiceDetailPage: action buttons, status badge, payment form use canonical components
- [ ] ProposalFormPage: template selector, items editor use canonical components
- [ ] `PasswordField.jsx` deleted — zero import references
- [ ] `FeatureGate.jsx` deleted (if applicable) — zero import references
- [ ] `UpgradeModal.jsx` deleted (if applicable) — zero import references

### npm Build Verification
```bash
npm run build
```
Must exit with code 0.

### Manual UI Verification
**SettingsPage:**
- Open `/app/settings` — profile form renders all fields
- Update name, email, phone, address, country, currency — save persists
- Upload avatar — avatar updates
- Upload logo — logo preview updates
- Change invoice brand color — color picker works
- View subscription section — usage meters, upgrade buttons, billing portal link
- Verify FeatureGate shows/hides branding section based on plan

**AuthPage:**
- Open `/login` — form renders with email + password
- Toggle password visibility — eye icon toggle works
- Submit with invalid credentials — error message displays
- Open `/signup` — signup form renders

**InvoiceFormPage:**
- Open `/app/invoices/new` — all fields render
- Add line items — items editor functions
- Remove line items — remove button works
- Totals auto-calculate on item change
- Save creates invoice, navigates to detail page

**InvoiceDetailPage:**
- Open `/app/invoices/:id` — invoice preview renders
- Mark sent / Mark paid buttons work
- Duplicate button creates copy
- PDF download generates file
- Payment recording form functions

**ProposalFormPage:**
- Open `/app/proposals/new` — template selector works
- Custom fields editable
- Items editor functional
- PDF preview generates
- Save creates proposal

---

## PR 9 — Final Cleanup & Legacy Component Deletion

### Objective
Delete all remaining legacy components. The `components/` folder should now contain only `AppLayout.jsx` (already using `ui/` components) and any truly unique files. Rename or archive the folder.

### Files Deleted
- `frontend/src/components/Button.jsx` (if still exists from earlier PR)
- `frontend/src/components/EmptyState.jsx` (if still exists)
- `frontend/src/components/LoadingSpinner.jsx` (if still exists)
- `frontend/src/components/Modal.jsx` (if still exists)
- `frontend/src/components/PricingCard.jsx` (if still exists)
- `frontend/src/components/StatCard.jsx` (if still exists)
- `frontend/src/components/StatusBadge.jsx` (if still exists)
- `frontend/src/components/Table.jsx` (if still exists)
- `frontend/src/components/Input.jsx` (if still exists)
- `frontend/src/components/Card.jsx` (if still exists)
- `frontend/src/components/PasswordField.jsx` (if still exists)
- `frontend/src/components/FeatureGate.jsx` (if still exists)
- `frontend/src/components/UpgradeModal.jsx` (if still exists)

### Files Remaining in `components/`
- `frontend/src/components/AppLayout.jsx` — keep (uses `ui/` components and layout orchestration)
- `frontend/src/components/PublicLayout.jsx` — keep (marketing layout shell)
- `frontend/src/components/ProtectedRoute.jsx` — keep (auth guard, no UI)

### Breaking Changes
None.

### Risk Level
**Low** — verification must confirm zero import references remain.

### Estimated Time
30 minutes.

### Validation Checklist
- [ ] Run `grep -rn "from.*'\.\./components/[A-Z]" frontend/src/ --include="*.{jsx,js}" | grep -v "ui/" | grep -v "AppLayout\|PublicLayout\|ProtectedRoute"` — returns zero matches
- [ ] Every legacy component confirmed deleted

### npm Build Verification
```bash
npm run build
```
Must exit with code 0.

### Manual UI Verification
- Quick smoke test of all major screens: Dashboard, Clients, Invoices, Settings, Analytics
- Verify auth flow: login, logout

---

## PR 10 (Optional) — Migration Status Appendix Update

### Objective
Update PROJECT_STATUS.md migration status table to reflect all screens as Complete.

### Files Modified
- `PROJECT_STATUS.md` — update section 17 (migration status)

### Risk Level
**Minimal** — documentation only.

---

## Priority Matrix

### Priority 0 — Must Do Before Any Migration
| Task | Rationale |
|------|-----------|
| PR 1: Dead code removal | Removes 1339-line dead stylesheet that could cause confusion. Clear evidence of zero imports. Zero risk. |
| Confirm `npm run build` passes on current branch | Baseline. If build fails before migration starts, no PR can be validated. |

### Priority 1 — Quick Wins That Reduce Blast Radius
| Task | Rationale |
|------|-----------|
| PR 2: DashboardPage CSS cleanup | Single file, no shared dependencies. Immediate reduction in raw CSS class usage. |
| PR 3: InvoicesPage & ClientsPage CSS cleanup | Two files, independent. Eliminates legacy class patterns in already-migrated pages. |
| PR 4: StatusBadge, EmptyState, LoadingSpinner replacement | Deletes 3 legacy leaf components. Unlocks migration path for middle-layer components. |

### Priority 2 — Dependency Chain Resolution
| Task | Rationale |
|------|-----------|
| PR 5: Button, Modal, PricingCard chain removal | Must happen before FeatureGate migration. These three form the foundation of UpgradeModal. |
| PR 6: UpgradeModal & FeatureGate migration | Critical path. Once complete, 7 legacy pages have zero legacy component dependencies. |

### Priority 3 — Page-by-Page Migration (Highest Risk Last)
| Task | Rationale |
|------|-----------|
| PR 7: Independent pages (ClientForm, ClientDetail, ForgotPassword, Features, Contact) | Low risk, independent. Good warm-up for complex migrations. |
| PR 8: Complex pages (SettingsPage, AuthPage, ResetPasswordPage, InvoiceFormPage, InvoiceDetailPage, ProposalFormPage) | Highest risk. SettingsPage has 12 form fields + branding + billing. InvoiceFormPage has line items editor. AuthPage affects all users. |
| PR 9: Final cleanup | Only after all pages use canonical components. |

---

## Rollback Protocol

If any PR causes a production regression:

1. **Immediate:** `git revert HEAD` (or restore specific files via checkout)
2. **Root cause analysis:** Identify whether the issue was a prop mapping error, a missing import, or an API mismatch
3. **Re-apply with fix:** Create a new PR with the corrected migration, test on staging first

---

*End of Document*