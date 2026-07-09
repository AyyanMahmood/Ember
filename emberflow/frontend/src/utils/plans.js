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
    features: ['5 invoices per month', '10 clients', 'Basic dashboard', 'PDF export'],
  },
  pro_monthly: {
    id: PLAN_IDS.pro_monthly,
    name: 'Pro Monthly',
    price: '$9',
    cadence: 'month',
    billingCycle: 'monthly',
    invoiceLimit: Infinity,
    clientLimit: Infinity,
    features: ['Unlimited invoices', 'Unlimited clients', 'Proposals', 'Analytics', 'Payment tracking', 'Branding'],
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

export const PRO_FEATURES = new Set(['analytics', 'proposals', 'payments', 'branding', 'unlimited']);

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
