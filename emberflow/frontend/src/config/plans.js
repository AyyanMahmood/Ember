// ─────────────────────────────────────────────────────────────────────────
// EmberFlow plan catalog — the single source of truth for what plans exist.
//
// This is DATA, not logic. Adding a future offering (Lifetime, Team, Business,
// Enterprise, Student, Founder's Edition, a regional variant, a promo, a
// limited-time launch price, …) is meant to be a matter of adding an entry
// here — plus its Polar product in the backend catalog
// (api/_utils/planCatalog.js) and its POLAR_PRODUCT_* env var — and NOT a
// rewrite of the pricing page, the subscription UI, the checkout service, or
// the entitlement layer. Everything downstream renders/derives from this list.
//
// None of those future plans are implemented today. The shape is simply
// written so it never assumes "exactly Free + Monthly + Yearly":
//   • `tier`   drives entitlement (today: 'free' | 'pro'; future: 'team', …).
//   • `group`  clusters interchangeable variants of one offering — the pieces
//              a cadence/variant toggle switches between (today: the 'pro'
//              group holds the monthly + yearly variants).
//   • `interval` is the billing rhythm and is open-ended: 'month' | 'year' |
//              'lifetime' | 'once' | null (free). It is NOT limited to m/y.
//   • `availability` lets a plan exist in the catalog without being publicly
//              listed ('public' | 'hidden') — the hook a promo/legacy plan
//              needs, without any promo *machinery* built now.
//   • `price`/`currency` are numeric + a currency code so a future regional
//              or promotional price is a value change, not new plumbing.
//
// IMPORTANT: keep this file dependency-free (pure data, no imports) — the
// backend verify harness dynamically imports it to guard against drift with
// api/_utils/planCatalog.js.
// ─────────────────────────────────────────────────────────────────────────

export const PLAN_TIERS = {
  free: 'free',
  pro: 'pro',
  // future: team, business, enterprise, student, founder, …
};

export const planCatalog = [
  {
    id: 'free',
    tier: 'free',
    group: 'free',
    name: 'Free',
    shortName: 'Free',
    price: 0,
    currency: 'USD',
    interval: null,
    limits: { invoices: 5, clients: 10 },
    features: ['5 invoices per month', '10 clients', 'Basic dashboard', 'PDF export', '3 invoice templates', 'Brand color customization'],
    availability: 'public',
    highlight: false,
  },
  {
    id: 'pro_monthly',
    tier: 'pro',
    group: 'pro',
    name: 'Pro Monthly',
    shortName: 'Monthly',
    price: 11,
    currency: 'USD',
    interval: 'month',
    limits: { invoices: Infinity, clients: Infinity },
    features: ['Unlimited invoices', 'Unlimited clients', 'Proposals', 'Analytics', 'Payment tracking', 'Logo, custom fonts & accent color', '17 invoice templates'],
    availability: 'public',
    highlight: true,
  },
  {
    id: 'pro_yearly',
    tier: 'pro',
    group: 'pro',
    name: 'Pro Yearly',
    shortName: 'Yearly',
    price: 130,
    currency: 'USD',
    interval: 'year',
    limits: { invoices: Infinity, clients: Infinity },
    features: ['Everything in Pro Monthly', 'One annual charge instead of twelve', 'Premium templates', 'Priority roadmap access'],
    availability: 'public',
    highlight: false,
  },
];

// interval → how it reads and how the (legacy) billing_cycle column is set.
// Generalized past month/year so a future lifetime/one-time plan Just Works.
export const INTERVAL_META = {
  free: { cadence: 'forever', billingCycle: 'free' },
  month: { cadence: 'month', billingCycle: 'monthly' },
  year: { cadence: 'year', billingCycle: 'yearly' },
  lifetime: { cadence: 'lifetime', billingCycle: 'lifetime' },
  once: { cadence: 'one-time', billingCycle: 'once' },
};

export function intervalMeta(interval) {
  return INTERVAL_META[interval == null ? 'free' : interval] || INTERVAL_META.free;
}
