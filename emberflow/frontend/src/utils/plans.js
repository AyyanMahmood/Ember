export const PLAN_IDS = {
  free: 'free',
  pro_monthly: 'pro_monthly',
  pro_yearly: 'pro_yearly',
};

export const PLANS = {
  free: {
    id: PLAN_IDS.free,
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    billingCycle: 'free',
    invoiceLimit: 5,
    clientLimit: 10,
    features: ['5 invoices per month', '10 clients', 'Basic dashboard', 'PDF export', '3 invoice templates', 'Brand color customization'],
  },
  pro_monthly: {
    id: PLAN_IDS.pro_monthly,
    name: 'Pro Monthly',
    price: '$9',
    cadence: 'month',
    billingCycle: 'monthly',
    invoiceLimit: Infinity,
    clientLimit: Infinity,
    features: ['Unlimited invoices', 'Unlimited clients', 'Proposals', 'Analytics', 'Payment tracking', 'Logo, custom fonts & accent color', '17 invoice templates'],
  },
  pro_yearly: {
    id: PLAN_IDS.pro_yearly,
    name: 'Pro Yearly',
    price: '$90',
    cadence: 'year',
    billingCycle: 'yearly',
    invoiceLimit: Infinity,
    clientLimit: Infinity,
    features: ['Everything in Pro Monthly', 'Two months included', 'Premium templates', 'Priority roadmap access'],
  },
};

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

export function isSubscriptionActive(subscription) {
  if (!subscription) return false;
  if (subscription.plan === PLAN_IDS.free) return true;
  return ['active', 'trialing', 'past_due'].includes(subscription.status);
}

export function isProSubscription(subscription) {
  return subscription?.plan !== PLAN_IDS.free && isSubscriptionActive(subscription);
}

export function getEntitlements(subscription) {
  const planId = normalizePlan(subscription?.plan);
  const pro = isProSubscription(subscription);
  return {
    plan: PLANS[planId],
    isPro: pro,
    invoiceLimit: pro ? Infinity : PLANS.free.invoiceLimit,
    clientLimit: pro ? Infinity : PLANS.free.clientLimit,
    canUseFeature: (feature) => !PRO_FEATURES.has(feature) || pro,
  };
}

export function formatLimit(value) {
  return value === Infinity ? 'Unlimited' : String(value);
}
