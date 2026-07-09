const crypto = require('crypto');

const PLAN_BY_PRICE_ENV = {
  pro_monthly: 'PADDLE_PRICE_PRO_MONTHLY',
  pro_yearly: 'PADDLE_PRICE_PRO_YEARLY',
};

function paddleBaseUrl() {
  return process.env.PADDLE_ENV === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
}

function getPriceId(plan) {
  const envName = PLAN_BY_PRICE_ENV[plan];
  if (!envName) throw new Error('Unsupported billing plan.');
  const priceId = process.env[envName];
  if (!priceId) throw new Error(`Missing ${envName}.`);
  return priceId;
}

function planFromPrice(priceId) {
  if (priceId && priceId === process.env.PADDLE_PRICE_PRO_YEARLY) return 'pro_yearly';
  if (priceId && priceId === process.env.PADDLE_PRICE_PRO_MONTHLY) return 'pro_monthly';
  return 'free';
}

function billingCycleFromPlan(plan) {
  if (plan === 'pro_yearly') return 'yearly';
  if (plan === 'pro_monthly') return 'monthly';
  return 'free';
}

async function paddleFetch(path, options = {}) {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) throw new Error('Missing PADDLE_API_KEY.');

  const response = await fetch(`${paddleBaseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.detail || payload?.error?.message || 'Paddle API request failed.';
    throw new Error(message);
  }
  return payload.data;
}

function verifyPaddleSignature(rawBody, signatureHeader) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) throw new Error('Missing PADDLE_WEBHOOK_SECRET.');
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(';').map((part) => {
      const [key, value] = part.trim().split('=');
      return [key, value];
    })
  );

  if (!parts.ts || !parts.h1) return false;
  const signedPayload = `${parts.ts}:${rawBody}`;
  const digest = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(parts.h1));
}

function extractPriceId(data) {
  return (
    data?.items?.[0]?.price?.id ||
    data?.items?.[0]?.price_id ||
    data?.price_id ||
    data?.subscription_items?.[0]?.price?.id ||
    ''
  );
}

function extractUserId(data) {
  return data?.custom_data?.user_id || data?.subscription?.custom_data?.user_id || '';
}

function normalizeSubscriptionPayload(data, fallback = {}) {
  const priceId = extractPriceId(data) || fallback.paddle_price_id;
  const plan = planFromPrice(priceId);
  const period = data?.current_billing_period || data?.billing_period || {};
  return {
    plan,
    status: data?.status || fallback.status || 'active',
    billing_cycle: billingCycleFromPlan(plan),
    paddle_customer_id: data?.customer_id || fallback.paddle_customer_id || null,
    paddle_subscription_id: data?.id?.startsWith?.('sub_') ? data.id : data?.subscription_id || fallback.paddle_subscription_id || null,
    paddle_price_id: priceId || null,
    paddle_product_id: data?.items?.[0]?.price?.product_id || fallback.paddle_product_id || null,
    current_period_start: period.starts_at || fallback.current_period_start || null,
    current_period_end: period.ends_at || fallback.current_period_end || null,
    cancel_at_period_end: data?.scheduled_change?.action === 'cancel' || fallback.cancel_at_period_end || false,
    trial_ends_at: data?.trial_dates?.ends_at || fallback.trial_ends_at || null,
  };
}

module.exports = {
  getPriceId,
  paddleFetch,
  verifyPaddleSignature,
  extractUserId,
  normalizeSubscriptionPayload,
};
