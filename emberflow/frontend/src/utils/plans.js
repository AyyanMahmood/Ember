import { intervalMeta, planCatalog, PLAN_TIERS } from '../config/plans.js';

// Plan LOGIC + derived accessors. The catalog (config/plans.js) is the data;
// this file turns it into the shapes the app consumes and holds the
// entitlement rules. Nothing here enumerates individual plan ids by hand —
// add a plan to the catalog and it flows through automatically.

export { PLAN_TIERS };

// Display price. Numeric amount + currency in the catalog is the source of
// truth; this is the only place a price becomes a string, so a future
// regional/promo price is a data change, not a find-and-replace.
export function formatPrice(amount, currency = 'USD') {
  return currency === 'USD' ? `$${amount}` : `${amount} ${currency}`;
}

// Back-compat + convenience view of each plan, keyed by id. Same shape the app
// already used (name/price string/cadence/billingCycle/invoiceLimit/
// clientLimit/features), plus the newer structured fields (tier/group/
// interval/priceValue/currency/availability/highlight/shortName).
export const PLANS = Object.fromEntries(
  planCatalog.map((p) => {
    const meta = intervalMeta(p.interval);
    return [
      p.id,
      {
        id: p.id,
        tier: p.tier,
        group: p.group,
        name: p.name,
        shortName: p.shortName,
        price: formatPrice(p.price, p.currency),
        priceValue: p.price,
        currency: p.currency,
        interval: p.interval,
        cadence: meta.cadence,
        billingCycle: meta.billingCycle,
        invoiceLimit: p.limits.invoices,
        clientLimit: p.limits.clients,
        features: p.features,
        availability: p.availability,
        highlight: p.highlight,
      },
    ];
  })
);

// Stable id map (back-compat). Derived, so it never drifts from the catalog.
export const PLAN_IDS = Object.fromEntries(planCatalog.map((p) => [p.id, p.id]));

export function getPlan(id) {
  return PLANS[id] || null;
}

// Publicly listable plans (excludes anything marked hidden/legacy/promo-only).
export function getPublicPlans() {
  return planCatalog.filter((p) => p.availability === 'public').map((p) => PLANS[p.id]);
}

// The interchangeable variants of one offering — what a cadence/variant
// toggle switches between (e.g. Monthly vs Yearly within the 'pro' group).
export function getPlansInGroup(group) {
  return getPublicPlans().filter((p) => p.group === group);
}

export function getPaidPlans() {
  return getPublicPlans().filter((p) => p.tier !== PLAN_TIERS.free);
}

// Annual saving for a group that has both a monthly and a yearly variant
// (monthly × 12 − yearly). Returns 0 when the group has no such pair, so it's
// safe for future groups/plans that aren't month/year based.
export function getAnnualSavings(group) {
  const plans = getPlansInGroup(group);
  const monthly = plans.find((p) => p.interval === 'month');
  const yearly = plans.find((p) => p.interval === 'year');
  if (!monthly || !yearly) return 0;
  return monthly.priceValue * 12 - yearly.priceValue;
}

// The Document Studio's live editor is available on every plan — only these
// are gated. Keep every feature check routed through canUseFeature() below
// rather than checking subscription.isPro directly around the app, so the
// feature matrix stays centralized in this one file.
export const PRO_FEATURES = new Set([
  'analytics',
  'proposals',
  'payments',
  'branding',
  'unlimited',
  'premium-templates',
  'advanced-export',
]);

// Export formats always available on Free; everything else needs Pro.
export const FREE_EXPORT_FORMATS = new Set(['pdf', 'print']);

export function canUseExportFormat(format, isPro) {
  return isPro || FREE_EXPORT_FORMATS.has(format);
}

export function normalizePlan(plan) {
  return PLANS[plan] ? plan : PLAN_IDS.free;
}

// Statuses under which a paid subscription still grants access. Mirrors the
// backend's hasAccessGrantingStatus() — kept here as the frontend's copy.
const ACCESS_GRANTING_STATUSES = ['active', 'trialing', 'past_due'];

export function isSubscriptionActive(subscription) {
  if (!subscription) return false;
  if (subscription.plan === PLAN_IDS.free) return true;
  return ACCESS_GRANTING_STATUSES.includes(subscription.status);
}

export function isProSubscription(subscription) {
  return subscription?.plan !== PLAN_IDS.free && isSubscriptionActive(subscription);
}

export function getEntitlements(subscription) {
  const planId = normalizePlan(subscription?.plan);
  const planDef = PLANS[planId];
  const pro = isProSubscription(subscription);
  return {
    plan: planDef,
    // Effective tier — additive, so future multi-tier UI (Team/Business/…)
    // can branch on it without a new plumbing pass. Today it's 'free' | 'pro'.
    tier: pro ? planDef.tier : PLAN_TIERS.free,
    isPro: pro,
    invoiceLimit: pro ? planDef.invoiceLimit : PLANS.free.invoiceLimit,
    clientLimit: pro ? planDef.clientLimit : PLANS.free.clientLimit,
    canUseFeature: (feature) => !PRO_FEATURES.has(feature) || pro,
  };
}

export function formatLimit(value) {
  return value === Infinity ? 'Unlimited' : String(value);
}

// Numeric price for a plan id (animated counters, savings math). Sourced from
// the catalog's numeric amount — no longer parsed back out of a display
// string.
export function planPriceValue(planId) {
  return PLANS[planId]?.priceValue ?? 0;
}
