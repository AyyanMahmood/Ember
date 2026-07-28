# Manual QA Checklist — V1

**Status: NOT verified.** Every fix in the V1 Polish Sprint (Critical/High/Medium, all complete) was validated only via `npm run build` and code/CSS reasoning — there is no headless browser or Android device available in this environment. Nothing below has been confirmed on a real device by Claude. This file replaces the old per-fix "please confirm on Arc/Android" prompts; work through it yourself at your own pace and check items off as you go (tick the `[ ]` → `[x]` in your editor, or check them off in GitHub's rendered view).

Test surfaces:
- **Arc (desktop)** — primary desktop browser
- **Android (Chrome)** — primary mobile surface, historically Arc for Android on a Samsung Galaxy A06 (~360px CSS width); plain Android Chrome is fine too

Where a flow is identical on both, it's listed once per device section anyway so each section is a complete, standalone pass — you don't have to cross-reference the other section to know you've covered everything.

---

## Arc (Desktop)

### Authentication
- [ ] Sign up with email/password — disposable email domains are rejected with a clear message
- [ ] Password strength meter updates live while typing on signup
- [ ] Sign up → no session returned → "check your email" message + resend-verification button both appear
- [ ] Resend verification email button works and shows a real spinner while sending, then "Email sent"
- [ ] Log in with correct email/password → lands on Dashboard
- [ ] Log in with wrong password → friendly error message (not a raw Supabase error string)
- [ ] Log in with an unconfirmed account → "email not confirmed" state shows the resend-verification option
- [x] Continue with Google → ✅ **Production verified (2026-07-27)** — tested successfully 7 separate times in a fresh Incognito window against `https://embersys.vercel.app`. URL bar never shows a raw `#access_token=...` fragment, redirect goes through `/auth/callback?code=...` then lands on `/app`. See CLAUDE.md's "Google OAuth callback bug fix" section for the full root-cause/fix history.
- [ ] Continue with Microsoft → **pending** — blocked purely on external Azure/Entra provider configuration, not yet tested. Not affected by the Google fix's code changes, but unverified until that config is completed.
- [ ] Cancel/deny the Google consent screen partway through → lands back on `/login` with a visible "Sign-in was cancelled or failed" message, not stuck on a blank/loading page (not explicitly exercised in the 7 verified runs — worth a dedicated pass)
- [x] After a successful Google login, refresh `/app` → ✅ verified — session persists (not logged out)
- [x] Logout (from sidebar footer) after a Google login → ✅ verified — redirected to marketing/login, session actually cleared, logging back in with Google works again
- [ ] Forgot password → submit email → reset link email arrives → reset page accepts new password → can log in with new password
- [ ] Settings → Security card → change password: current/new/confirm fields all show the eye-toggle and all three toggle together; wrong "current password" is rejected; success message appears

### Dashboard
- [ ] Stat cards show correct values: Total revenue, Pending invoices, Paid invoices, Clients
- [ ] Stat card icons are distinct (DollarSign / ArrowDownRight / CheckCircle2 / Users) — no duplicated icons
- [ ] On load, header/title appear immediately; stat cards show a small spinner briefly, not a blank flash or shimmering placeholder
- [ ] Recent invoices table populates and each invoice number links to its detail page
- [ ] "New invoice" button opens the invoice form
- [ ] Force an error (e.g. DevTools → Network → Offline, then reload) → header stays visible, error banner + "Try again" button appear, retry actually reloads once back online

### Clients
- [ ] List loads; search box filters by name/company/email/phone
- [ ] Country filter dropdown works (label is visually hidden but the control is still fully usable with a mouse and via keyboard)
- [ ] Add client — leaving required fields blank shows inline validation errors, not just a native browser bubble
- [ ] Phone field strips letters, allows digits/+/spaces/hyphens/parens
- [ ] Edit client — fields pre-fill correctly
- [ ] Delete client with no invoices — confirm dialog, deletion succeeds
- [ ] Delete client that has invoices — clear error explaining invoices must be removed first
- [ ] Client Detail page: 3-card billing summary shows even for a client with zero invoices (all zeroed, not hidden)
- [ ] Client Detail loading state: header shows "Client" + "Loading…", stat/detail cards show small spinners, no shimmer
- [ ] Client Detail error state keeps the header and back-to-clients link, has a working "Try again"

### Items (invoice/proposal line items)
- [ ] Add multiple line items on an invoice; totals (subtotal/tax/discount/total) recalculate live as you type
- [ ] Leave a row's description blank or quantity at 0 — row shows "Excluded — needs a quantity" and is left out of the totals
- [ ] Try to save with an excluded-but-partially-filled row — submission is blocked with a specific error, not silently dropped
- [ ] Remove a line item — totals update immediately
- [ ] Currency picker (EmberSelect) opens, search filters currencies, keyboard arrows + Enter select correctly

### Invoices
- [ ] Create invoice — client select is required (shows an error if left empty)
- [ ] Edit an existing invoice
- [ ] Mark sent / Mark paid from the list and from the detail page
- [ ] Duplicate invoice — lands on the new copy with a new invoice number
- [ ] Delete invoice — confirm dialog, deletion succeeds
- [ ] Bulk-select rows → bulk "Mark paid" and bulk "Delete" both work
- [ ] Filter by status + search, combined with pagination, all agree with each other
- [ ] Invoice Detail: record a payment (Pro account) — balance due updates
- [ ] Invoice Detail (Free account): payment form is replaced by an "Upgrade to Pro" prompt, not a broken form
- [ ] Invoice Detail: switch template via the Template Selector modal — preview updates, modal closes cleanly
- [ ] Invoice Detail error state (e.g. bad/deleted id) keeps header + back link + "Try again"

### Proposals
- [ ] Create a new proposal from a template
- [ ] Duplicate an existing proposal — copy is editable independently of the original
- [ ] Edit a proposal
- [ ] Delete a proposal

### Brand Studio
- [ ] (Pro account) Upload a logo via drag-and-drop; replace it; remove it — preview updates each time
- [ ] (Free account) Color + footer text are editable and reflected in the live preview
- [ ] (Free account) Logo/font/accent controls are visibly locked (blurred, "Unlock with Pro" CTA) and cannot be reached by Tab key
- [ ] Font picker — selecting each of the 7 fonts updates the live preview
- [ ] Accent color override toggle reveals its control with an animation, not an instant snap
- [ ] Switching the preview between Invoice/Proposal tabs crossfades smoothly
- [ ] Toggling Default vs. Your-brand preview crossfades smoothly
- [ ] On first load, the "Checking plan…" state also crossfades in/out rather than popping
- [ ] Narrow the window until the mobile preview sheet appears — it opens, traps Tab focus inside, and Escape closes it

### Templates
- [ ] Gallery shows all 17 templates (3 marked free, 14 marked Pro)
- [ ] Clicking a free template goes straight to a new invoice pre-set to that template
- [ ] (Free account) Clicking a Pro template opens the upgrade modal instead of applying it
- [ ] (Pro account) Clicking a Pro template applies it correctly

### Analytics
- [ ] (Pro account) Stat cards populate: total revenue, monthly revenue, pending, overdue
- [ ] (Pro account) Top-clients ranking table populates
- [ ] (Free account) Whole page shows the Pro upsell lock (same visual language as Brand Studio/Templates locks), not raw/broken data

### Responsive layouts
- [ ] Resize the window through 1920px → 1440px → 1024px → 768px — no horizontal scrollbar anywhere, no overlapping text/buttons
- [ ] Sidebar collapse/expand toggle works and persists after reload
- [ ] Landing page hero, features grid, pricing grid, FAQ grid all reflow sensibly at each breakpoint — specifically check the pricing grid goes straight from 2 columns to 1 column around 768px without a visibly squeezed middle state
- [ ] Tables' desktop view (not the mobile card layout) has no cut-off columns down to ~1024px
- [ ] At exactly 768px and above, the marketing navbar shows the full horizontal nav (Features, Pricing, Log in, Start free, theme toggle) with no hamburger icon — confirm it looks pixel-identical to before this change
- [ ] Narrow the window to 767px and below — the horizontal nav links disappear and a hamburger icon appears in the top-right, logo stays top-left
- [ ] Clicking the hamburger opens a full-height drawer sliding in smoothly from the right, containing Features, Pricing, FAQ, Contact, Log in, then a theme toggle + full-width "Get Started" button at the bottom
- [ ] Clicking Features/Pricing/FAQ in the drawer scrolls to the right section on the landing page and closes the drawer
- [ ] Clicking Contact/Log in/Get Started navigates correctly and closes the drawer
- [ ] Clicking outside the drawer (on the dimmed backdrop) closes it
- [ ] Pressing Escape while the drawer is open closes it
- [ ] While the drawer is open, the page behind it does not scroll
- [ ] Tab key cycles only through the drawer's own links/buttons while open (focus doesn't escape to the page behind it)
- [ ] After closing the drawer (any method), keyboard focus returns to the hamburger button, not lost to the top of the page
- [ ] Resize back above 768px while the drawer is open — confirm nothing looks broken (drawer should close/hide, full desktop nav should return)

### Loading states
- [ ] Confirm there are **no shimmering skeleton placeholders anywhere** in the app (Dashboard, Clients, Client Detail, Client Form, any table) — this was intentionally removed; if you see shimmer bars anywhere, that's a regression
- [ ] Dashboard/Clients/Client Detail/Client Form: page header and static labels stay visible while loading; only the actual data region shows a small spinner
- [ ] Any `Table` component mid-load shows its column headers plus one centered spinner row, not a blank table
- [ ] Auth submit / resend-verification buttons show a real spinner while working, not just swapped text

### Empty states
- [ ] Brand-new account (or filter to zero results): Invoices/Clients/Proposals each show an illustration, a clear message, and a working call-to-action button
- [ ] Filtering clients by a country with no matches shows the empty state, not a blank table

### Error states
- [ ] DevTools → Network → Offline, then trigger a load on Dashboard, Clients, Client Detail, Invoice Detail — each keeps its header and shows a working "Try again"
- [ ] Submit the Client form / Invoice form / password-change form with invalid data — inline field errors appear with visible focus states

### PDF export
- [ ] Download an invoice PDF from the list view ("quick download")
- [ ] Export an invoice PDF from the detail page's export menu
- [ ] Export a proposal PDF
- [ ] (Pro account with Brand Studio set up) Exported PDF actually reflects your logo/color/font, not just the default theme
- [ ] (Free account) Export menu correctly limits format options / prompts upgrade where expected

### Free vs Pro feature gating
- [ ] Free plan invoice/client limits are enforced — hitting the limit shows an upgrade prompt instead of silently failing
- [ ] Payment tracking is hidden/upsold on Invoice Detail for Free accounts
- [ ] Brand Studio logo/font/accent are locked for Free, fully usable for Pro
- [ ] Templates: Pro-only templates are locked for Free, usable for Pro
- [ ] Analytics is fully gated for Free, fully usable for Pro
- [ ] "Upgrade monthly" / "Upgrade yearly" buttons open Polar checkout (use a Polar **sandbox** to complete a test purchase; see POLAR_SETUP.md → Testing guide)
- [ ] After a sandbox purchase, the webhook syncs `subscriptions` (Pro features unlock; "Manage billing" appears)
- [ ] "Manage billing" opens the Polar customer portal
- [ ] Cancelling in the portal keeps Pro until period end (`cancel_at_period_end`), then drops to Free after revoke

---

## Android (Chrome)

### Authentication
- [ ] Sign up with email/password — disposable email domains are rejected with a clear message
- [ ] Password strength meter updates live while typing on signup
- [ ] Sign up → no session returned → "check your email" message + resend-verification button both appear, both fit on screen without overlap
- [ ] Resend verification email button works and shows a real spinner while sending
- [ ] Log in with correct email/password → lands on Dashboard
- [ ] Log in with wrong password → friendly error message
- [ ] Log in with an unconfirmed account → resend-verification option shows
- [ ] Continue with Google (icon-only OAuth button) → code fix is ✅ production verified on desktop (see Arc section above) but **not yet specifically re-tested on Android** — no raw `#access_token=...` fragment should ever be visible, should land on `/app`
- [ ] Continue with Microsoft (icon-only OAuth button) → **pending** external Azure/Entra provider config, same as desktop
- [ ] Logout from the sidebar (via the mobile drawer) actually clears the session
- [ ] Forgot password → reset email → reset page → new password → log in with it
- [ ] Settings → Security: change password, eye-toggle on all three fields, touch targets are large enough to tap reliably

### Dashboard
- [ ] Stat cards stack correctly at ~360-414px width, no overlap or cut-off text
- [ ] Header/title visible immediately on load; stat cards show a brief spinner, no shimmer, no blank flash
- [ ] Recent invoices table (mobile card layout) is readable and tappable, no horizontal scroll
- [ ] "New invoice" button is reachable and tappable
- [ ] Airplane-mode / lose connection, reload — header stays, error banner + "Try again" appear

### Clients
- [ ] List + search + country filter all usable on a touch keyboard (filter row doesn't overflow)
- [ ] Add client form — validation errors are legible and don't get hidden behind the mobile keyboard
- [ ] Phone field: numeric keyboard appears (type="tel"), formats correctly
- [ ] Edit / delete client work with touch (confirm dialog is fully reachable, not cut off)
- [ ] Client Detail: 3-card stat grid doesn't orphan a lone card in an awkward row at tablet-ish widths (rotate to landscape to check the mid-range too)
- [ ] Client Detail loading/error states behave the same as desktop (header stays, spinner not shimmer, retry works)

### Items (invoice/proposal line items)
- [ ] Add/remove line items with touch — totals update live
- [ ] Blank/zero-quantity row shows the "Excluded — needs a quantity" warning and is legible on a narrow screen
- [ ] Saving with an excluded-but-partially-filled row is blocked with a visible error
- [ ] Currency EmberSelect opens as a usable touch dropdown, search input isn't cramped, options are tappable

### Invoices
- [ ] Create invoice on a touch keyboard — all fields reachable, client select works
- [ ] Mark sent / Mark paid from the mobile card list — action buttons wrap instead of overflowing the card (this was a known fixed bug — confirm it stays fixed)
- [ ] Duplicate / Edit / Delete an invoice via touch
- [ ] Bulk-select + bulk actions work with touch on the mobile list
- [ ] Filters + pagination controls wrap/stack instead of forcing horizontal scroll
- [ ] Invoice Detail: record a payment (Pro), template switcher modal is usable full-screen on mobile
- [ ] Invoice Detail error state keeps header + back link, retry works

### Proposals
- [ ] Create, duplicate, edit, delete a proposal via touch, no layout breakage

### Brand Studio
- [ ] Logo upload/replace/remove works via mobile file picker (drag-and-drop obviously doesn't apply — confirm the tap-to-upload fallback works)
- [ ] Free tier: color/footer editable, logo/font/accent visibly locked and not reachable via touch or keyboard nav
- [ ] Font picker cards are tappable and legible at mobile width
- [ ] Mobile preview sheet: opens from the FAB, fills the screen appropriately, Tab-trap doesn't apply the same way on touch but Escape/close button still works, closing returns you to the form without losing entered data

### Templates
- [ ] Gallery grid reflows to fewer columns and stays tappable at mobile width
- [ ] Free template tap → new invoice with that template
- [ ] Pro template tap (Free account) → upgrade modal opens full-screen and is dismissable

### Analytics
- [ ] (Pro) Stat cards and top-clients table are legible and don't overflow at mobile width
- [ ] (Free) Upsell lock screen renders correctly, CTA is tappable

### Responsive layouts
- [ ] Test at real Android widths: ~360px (Galaxy A06 class), ~390-414px (typical mid/high-end), and once in landscape
- [ ] No horizontal page scroll anywhere in the app or marketing site
- [ ] Sidebar opens as a full mobile drawer via the hamburger button; closing it returns focus to the hamburger button
- [ ] Marketing navbar shows only the logo (left) and a hamburger icon (right) — no horizontal link row, no crumpling/overlap
- [ ] Tapping the hamburger opens a full-height drawer sliding in from the right with Features, Pricing, FAQ, Contact, Log in, then a theme toggle + full-width "Get Started" button at the bottom — check it feels smooth, not janky, on a real device
- [ ] Tapping Features/Pricing/FAQ scrolls to the right section and closes the drawer; tapping Contact/Log in/Get Started navigates and closes it
- [ ] Tapping outside the drawer (on the dimmed backdrop) closes it
- [ ] While the drawer is open, the page behind it does not scroll (test with a real swipe, not just a click)
- [ ] Rotate to landscape with the drawer open — it should still behave correctly (full height, scrollable if content overflows)
- [ ] EmberSelect dropdowns (Country, Currency, template filters) are comfortably tappable, text isn't flush against the edges

### Loading states
- [ ] Confirm there are **no shimmering skeleton placeholders anywhere** — same check as desktop, but worth re-confirming since mobile is where loading is most noticeable on a slower connection
- [ ] Headers/static labels stay visible while data loads; only genuinely data-dependent regions show a spinner
- [ ] Tables show header + centered spinner while loading, not a blank card

### Empty states
- [ ] Empty Invoices/Clients/Proposals lists show illustration + message + CTA, all fit without overflow at mobile width
- [ ] Empty filtered-search results render cleanly

### Error states
- [ ] Airplane mode, trigger a load on Dashboard/Clients/Client Detail/Invoice Detail — header stays, retry button is reachable and works once back online
- [ ] Form validation errors are visible above/near the mobile keyboard, not hidden underneath it

### PDF export
- [ ] Download an invoice PDF on Android Chrome — confirm it actually downloads/opens (mobile PDF handling can differ from desktop)
- [ ] Export a proposal PDF on Android Chrome
- [ ] Exported PDF reflects Brand Studio branding for Pro accounts

### Free vs Pro feature gating
- [ ] Free plan limits + upgrade prompts trigger correctly on mobile
- [ ] Payment tracking upsell shows on Invoice Detail for Free
- [ ] Brand Studio / Templates / Analytics gating all match desktop behavior
- [ ] Upgrade buttons open Polar checkout correctly in the mobile browser

---

## After you finish

Once you've actually gone through this (or a meaningful subset), tell me what broke — I'll fix real bugs you find rather than guessing. Don't check items off unless you actually tested them; a stale "verified" checklist is worse than an honest "not yet tested" one.
