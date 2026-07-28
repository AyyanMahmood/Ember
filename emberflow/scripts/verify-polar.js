#!/usr/bin/env node
/**
 * Framework-free verification for the Polar billing logic in
 * api/_utils/polar.js. Runs with plain `node` — no test runner required:
 *
 *   node scripts/verify-polar.js      (or: npm run verify:polar)
 *
 * Covers the pure, provider-shaped logic that a live sandbox test can't
 * cheaply exercise on every change: plan<->product mapping, status-aware
 * subscription normalization, user-id extraction, and — most importantly —
 * the Standard Webhooks signature verification (valid round-trip plus
 * rejection of tampered signatures, tampered bodies, and stale timestamps).
 *
 * The end-to-end checkout/portal/webhook-delivery flow is verified manually
 * against a Polar sandbox — see POLAR_SETUP.md -> "Testing guide".
 */

process.env.POLAR_SERVER = 'sandbox';
process.env.POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN || 'polar_oat_test';
process.env.POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET || 'super-secret-polar-signing-key';
process.env.POLAR_PRODUCT_PRO_MONTHLY = 'prod_monthly_123';
process.env.POLAR_PRODUCT_PRO_YEARLY = 'prod_yearly_456';

const {
  getProductId,
  planFromProduct,
  billingCycleFromPlan,
  verifyPolarWebhook,
  extractUserId,
  normalizeSubscription,
} = require('../api/_utils/polar.js');
const { Webhook } = require('standardwebhooks');

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass++;
    console.log('  ok  -', name);
  } else {
    fail++;
    console.log(' FAIL -', name);
  }
}

console.log('\n# plan <-> product mapping');
assert('getProductId(pro_monthly)', getProductId('pro_monthly') === 'prod_monthly_123');
assert('getProductId(pro_yearly)', getProductId('pro_yearly') === 'prod_yearly_456');
assert('getProductId(bogus) throws', (() => { try { getProductId('nope'); return false; } catch { return true; } })());
assert('planFromProduct(monthly)', planFromProduct('prod_monthly_123') === 'pro_monthly');
assert('planFromProduct(yearly)', planFromProduct('prod_yearly_456') === 'pro_yearly');
assert('planFromProduct(unknown)=free', planFromProduct('prod_other') === 'free');
assert('billingCycle monthly', billingCycleFromPlan('pro_monthly') === 'monthly');
assert('billingCycle yearly', billingCycleFromPlan('pro_yearly') === 'yearly');

console.log('\n# normalizeSubscription (active)');
const activeSub = {
  id: 'sub_abc',
  status: 'active',
  product_id: 'prod_monthly_123',
  customer_id: 'cus_xyz',
  cancel_at_period_end: false,
  current_period_start: '2026-07-01T00:00:00Z',
  current_period_end: '2026-08-01T00:00:00Z',
  customer: { id: 'cus_xyz', external_id: 'user-uuid-1', email: 'a@b.com' },
  metadata: { user_id: 'user-uuid-1', plan: 'pro_monthly' },
};
const n1 = normalizeSubscription(activeSub, {});
assert('active -> plan pro_monthly', n1.plan === 'pro_monthly');
assert('active -> status active', n1.status === 'active');
assert('active -> billing monthly', n1.billing_cycle === 'monthly');
assert('active -> polar_customer_id', n1.polar_customer_id === 'cus_xyz');
assert('active -> polar_subscription_id', n1.polar_subscription_id === 'sub_abc');
assert('active -> polar_product_id', n1.polar_product_id === 'prod_monthly_123');
assert('active -> period_start ISO', n1.current_period_start === '2026-07-01T00:00:00.000Z');
assert('active -> period_end ISO', n1.current_period_end === '2026-08-01T00:00:00.000Z');
assert('active -> cancel false', n1.cancel_at_period_end === false);

console.log('\n# normalizeSubscription (cancel at period end, still active)');
const cancelingSub = { ...activeSub, cancel_at_period_end: true };
const n2 = normalizeSubscription(cancelingSub, {});
assert('canceling -> keeps plan pro_monthly (still active)', n2.plan === 'pro_monthly');
assert('canceling -> cancel_at_period_end true', n2.cancel_at_period_end === true);

console.log('\n# normalizeSubscription (revoked -> collapses to free)');
const revokedSub = { ...activeSub, status: 'canceled' };
const n3 = normalizeSubscription(revokedSub, {});
assert('revoked -> plan free', n3.plan === 'free');
assert('revoked -> status canceled preserved', n3.status === 'canceled');
assert('revoked -> billing free', n3.billing_cycle === 'free');
assert('revoked -> keeps polar_subscription_id for history', n3.polar_subscription_id === 'sub_abc');

console.log('\n# extractUserId');
assert('extractUserId from external_id', extractUserId(activeSub) === 'user-uuid-1');
assert('extractUserId from metadata fallback', extractUserId({ metadata: { user_id: 'u2' } }) === 'u2');
assert('extractUserId empty when absent', extractUserId({}) === '');

console.log('\n# verifyPolarWebhook (Standard Webhooks)');
const secret = process.env.POLAR_WEBHOOK_SECRET;
const signer = new Webhook(Buffer.from(secret, 'utf-8').toString('base64'));
const body = JSON.stringify({ type: 'subscription.active', data: activeSub });
const now = new Date();
const tsSeconds = Math.floor(now.getTime() / 1000);
const msgId = 'msg_test_1';
const sig = signer.sign(msgId, now, body); // "v1,<base64>"
const goodHeaders = {
  'webhook-id': msgId,
  'webhook-timestamp': String(tsSeconds),
  'webhook-signature': sig,
};
try {
  const verified = verifyPolarWebhook(body, goodHeaders);
  assert('valid signature verifies', verified && verified.type === 'subscription.active');
  assert('verified payload is raw snake_case', verified.data.current_period_end === '2026-08-01T00:00:00Z');
} catch (e) {
  assert('valid signature verifies (threw: ' + e.message + ')', false);
}
assert('tampered signature throws', (() => {
  try { verifyPolarWebhook(body, { ...goodHeaders, 'webhook-signature': 'v1,AAAAtampered' }); return false; } catch { return true; }
})());
assert('tampered body throws', (() => {
  try { verifyPolarWebhook(body + ' ', goodHeaders); return false; } catch { return true; }
})());
const staleTs = tsSeconds - 3600;
const staleSig = signer.sign(msgId, new Date(staleTs * 1000), body);
assert('stale timestamp throws', (() => {
  try {
    verifyPolarWebhook(body, { 'webhook-id': msgId, 'webhook-timestamp': String(staleTs), 'webhook-signature': staleSig });
    return false;
  } catch { return true; }
})());

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail === 0 ? 0 : 1);
