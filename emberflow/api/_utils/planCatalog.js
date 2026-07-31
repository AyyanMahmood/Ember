// Backend plan catalog — the billing-relevant projection of the plan catalog.
//
// The frontend's config/plans.js is the full source of truth (display, prices,
// features). The SERVER only needs each plan's id, tier, interval, and the env
// var naming its Polar product — so that's all this holds. Add a future plan
// here + set its POLAR_PRODUCT_* env var in Vercel, and checkout + webhook
// mapping extend automatically (getProductId / planFromProduct / billing cycle
// all derive from this list — no code edit per plan).
//
// Kept honest against frontend/src/config/plans.js by scripts/verify-polar.js,
// which dynamically imports the frontend catalog and asserts the two agree on
// the set of plan ids and their intervals.
const PLAN_CATALOG = [
  { id: 'free', tier: 'free', interval: null, productEnvVar: null },
  { id: 'pro_monthly', tier: 'pro', interval: 'month', productEnvVar: 'POLAR_PRODUCT_PRO_MONTHLY' },
  { id: 'pro_yearly', tier: 'pro', interval: 'year', productEnvVar: 'POLAR_PRODUCT_PRO_YEARLY' },
];

// interval → the value written to subscriptions.billing_cycle. Open-ended, so
// a future lifetime/one-time plan needs no special-casing downstream.
const BILLING_CYCLE_BY_INTERVAL = {
  month: 'monthly',
  year: 'yearly',
  lifetime: 'lifetime',
  once: 'once',
};

function planById(id) {
  return PLAN_CATALOG.find((p) => p.id === id) || null;
}

// Plans that map to a real Polar product (i.e. every paid plan).
function billablePlans() {
  return PLAN_CATALOG.filter((p) => p.productEnvVar);
}

function planIds() {
  return PLAN_CATALOG.map((p) => p.id);
}

module.exports = {
  PLAN_CATALOG,
  BILLING_CYCLE_BY_INTERVAL,
  planById,
  billablePlans,
  planIds,
};
