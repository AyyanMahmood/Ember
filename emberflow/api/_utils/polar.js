const { Webhook, WebhookVerificationError } = require('standardwebhooks');

// Map each internal plan id to the env var holding its Polar product id.
// Polar checkout is created from PRODUCT ids (not price ids like Paddle).
const PLAN_TO_PRODUCT_ENV = {
  pro_monthly: 'POLAR_PRODUCT_PRO_MONTHLY',
  pro_yearly: 'POLAR_PRODUCT_PRO_YEARLY',
};

// Polar subscription statuses that still grant access to paid features.
const ACCESS_GRANTING_STATUSES = new Set(['active', 'trialing', 'past_due']);

function polarBaseUrl() {
  return process.env.POLAR_SERVER === 'production'
    ? 'https://api.polar.sh'
    : 'https://sandbox-api.polar.sh';
}

function getProductId(plan) {
  if (typeof plan !== 'string') {
    throw new Error('Invalid billing plan.');
  }

  const envName = PLAN_TO_PRODUCT_ENV[plan];
  if (!envName) throw new Error('Unsupported billing plan.');
  const productId = process.env[envName];
  if (!productId) throw new Error(`Missing ${envName}.`);
  return productId;
}

function planFromProduct(productId) {
  if (productId && productId === process.env.POLAR_PRODUCT_PRO_YEARLY) return 'pro_yearly';
  if (productId && productId === process.env.POLAR_PRODUCT_PRO_MONTHLY) return 'pro_monthly';
  return 'free';
}

function billingCycleFromPlan(plan) {
  if (plan === 'pro_yearly') return 'yearly';
  if (plan === 'pro_monthly') return 'monthly';
  return 'free';
}

async function polarFetch(path, options = {}) {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) throw new Error('Missing POLAR_ACCESS_TOKEN.');

  const response = await fetch(`${polarBaseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  // Polar returns the resource object directly (not wrapped in a { data }
  // envelope like Paddle), so callers use the returned payload as-is.
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('Polar API Error:');
    console.error(JSON.stringify(payload, null, 2));
    throw new Error(
      typeof payload?.detail === 'string'
        ? payload.detail
        : JSON.stringify(payload?.error || payload)
    );
  }

  return payload;
}

// Polar signs every webhook per the Standard Webhooks spec. Its signing
// secret is a plain string; the Standard Webhooks verifier expects a base64
// secret that it base64-decodes back into the HMAC key, so we base64-encode
// it first — identical to what @polar-sh/sdk does internally. verify() also
// enforces the required webhook-id/webhook-timestamp/webhook-signature
// headers, a 5-minute timestamp tolerance (replay protection), and a
// constant-time comparison. It throws WebhookVerificationError on failure and
// returns the parsed (snake_case) event payload on success.
function verifyPolarWebhook(rawBody, headers) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) throw new Error('Missing POLAR_WEBHOOK_SECRET.');
  const webhook = new Webhook(Buffer.from(secret, 'utf-8').toString('base64'));
  return webhook.verify(rawBody, headers);
}

// The Supabase user id travels with every subscription as the customer's
// external_id (set as external_customer_id at checkout) and, redundantly, in
// the checkout metadata. Prefer the customer external id.
function extractUserId(data) {
  return data?.customer?.external_id || data?.metadata?.user_id || '';
}

function toIso(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

// Flatten a Polar subscription object (from a webhook event) into a
// `subscriptions` row. `fallback` is the existing row, used to preserve
// fields Polar didn't include on a given event.
function normalizeSubscription(subscription, fallback = {}) {
  const status = subscription?.status || fallback.status || 'active';
  const productId = subscription?.product_id || fallback.polar_product_id || null;

  // Status-aware plan derivation: a subscription maps to a paid plan only
  // while it actually grants access. Revoked/unpaid/expired subscriptions
  // collapse to 'free' so the frontend entitlement check (status-based) AND
  // the DB-level free-limit triggers (which read `plan`, not `status`) both
  // agree the user is no longer Pro. A cancel-at-period-end subscription
  // stays `active` until the period ends, so the user keeps Pro until then.
  const grantsAccess = ACCESS_GRANTING_STATUSES.has(status);
  const plan = grantsAccess ? planFromProduct(productId) : 'free';

  return {
    plan,
    status,
    billing_cycle: billingCycleFromPlan(plan),
    polar_customer_id:
      subscription?.customer_id || subscription?.customer?.id || fallback.polar_customer_id || null,
    polar_subscription_id: subscription?.id || fallback.polar_subscription_id || null,
    polar_product_id: productId,
    current_period_start:
      toIso(subscription?.current_period_start) || fallback.current_period_start || null,
    current_period_end:
      toIso(subscription?.current_period_end) || fallback.current_period_end || null,
    cancel_at_period_end:
      typeof subscription?.cancel_at_period_end === 'boolean'
        ? subscription.cancel_at_period_end
        : fallback.cancel_at_period_end || false,
    trial_ends_at: toIso(subscription?.ends_at && status === 'trialing' ? subscription.ends_at : null)
      || fallback.trial_ends_at
      || null,
  };
}

module.exports = {
  getProductId,
  planFromProduct,
  billingCycleFromPlan,
  polarFetch,
  verifyPolarWebhook,
  WebhookVerificationError,
  extractUserId,
  normalizeSubscription,
};
