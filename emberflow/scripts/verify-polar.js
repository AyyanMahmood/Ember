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
  verifyPolarEnvironmentHealthy,
  isMissingResourceError,
  guardedSelfHeal,
  createSelfHealCircuitBreaker,
  shouldTripCircuit,
  SELF_HEAL_TRIP_THRESHOLD,
  __setSelfHealCircuitBreakerForTesting,
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

// ── MF-7: Polar self-heal circuit breaker ────────────────────────────────
// Mocks global.fetch (polarFetch's only I/O dependency) and an in-memory
// fake Redis client (the circuit breaker's only I/O dependency) — no live
// Polar or Upstash credentials needed for any of this to be deterministic.
function fakeFetchResponse(status, body = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function createFakeRedis(opts = {}) {
  const store = new Map();
  return {
    async get(key) {
      if (opts.failGet) throw new Error('simulated Redis read failure');
      return store.has(key) ? store.get(key) : null;
    },
    async incr(key) {
      if (opts.failIncr) throw new Error('simulated Redis write failure');
      const next = (store.get(key) || 0) + 1;
      store.set(key, next);
      return next;
    },
    async expire() {
      // TTL expiry is Redis's own mechanism, not app logic — nothing to
      // simulate here. Cooldown expiry is tested below by directly
      // clearing the tripped key, which is exactly what a real expiry
      // looks like from this code's point of view: the key is just gone.
    },
    async set(key, value) {
      store.set(key, value);
    },
    _clear(key) {
      store.delete(key);
    },
    _get(key) {
      return store.get(key);
    },
  };
}

async function runSelfHealTests() {
  console.log('\n# isMissingResourceError (401/403/5xx/network never enter the 404 self-heal path)');
  assert('404 is eligible', isMissingResourceError({ status: 404 }) === true);
  assert('401 is not eligible', isMissingResourceError({ status: 401 }) === false);
  assert('403 is not eligible', isMissingResourceError({ status: 403 }) === false);
  assert('500 is not eligible', isMissingResourceError({ status: 500 }) === false);
  assert('network error (no .status) is not eligible', isMissingResourceError(new Error('fetch failed')) === false);
  assert('undefined error is not eligible', isMissingResourceError(undefined) === false);

  console.log('\n# shouldTripCircuit (pure threshold logic)');
  assert(`below threshold (${SELF_HEAL_TRIP_THRESHOLD - 1}) does not trip`, shouldTripCircuit(SELF_HEAL_TRIP_THRESHOLD - 1) === false);
  assert(`at threshold (${SELF_HEAL_TRIP_THRESHOLD}) trips`, shouldTripCircuit(SELF_HEAL_TRIP_THRESHOLD) === true);
  assert('above threshold trips', shouldTripCircuit(SELF_HEAL_TRIP_THRESHOLD + 1) === true);

  const realFetch = global.fetch;

  console.log('\n# verifyPolarEnvironmentHealthy (Layer 1)');
  global.fetch = async () => fakeFetchResponse(200, { id: 'prod_monthly_123' });
  assert('known product resolves -> environment healthy', (await verifyPolarEnvironmentHealthy()) === true);

  global.fetch = async () => fakeFetchResponse(404, { detail: 'Not found' });
  assert('known product 404s -> environment NOT healthy', (await verifyPolarEnvironmentHealthy()) === false);

  global.fetch = async () => fakeFetchResponse(401, { detail: 'Unauthorized' });
  assert('known product 401s -> environment NOT healthy', (await verifyPolarEnvironmentHealthy()) === false);

  global.fetch = async () => fakeFetchResponse(500, { detail: 'Internal error' });
  assert('known product 5xx -> environment NOT healthy', (await verifyPolarEnvironmentHealthy()) === false);

  global.fetch = async () => { throw new TypeError('fetch failed'); };
  assert('network failure on product check -> environment NOT healthy', (await verifyPolarEnvironmentHealthy()) === false);

  console.log('\n# verifyPolarEnvironmentHealthy — partial misconfiguration (only ONE configured product resolves)');
  // Two products are configured (PRO_MONTHLY + PRO_YEARLY, set at the top of
  // this script). Only checking the first-found one would let a
  // misconfiguration specific to just one of them slip through.
  global.fetch = async (url) => {
    if (String(url).includes('prod_monthly_123')) return fakeFetchResponse(200, { id: 'prod_monthly_123' });
    return fakeFetchResponse(404, { detail: 'Not found' }); // yearly product missing in this environment
  };
  assert(
    'environment NOT healthy when only one of two configured products resolves',
    (await verifyPolarEnvironmentHealthy()) === false
  );

  console.log('\n# guardedSelfHeal — healthy environment + stale resource: events 1 and 2 permitted');
  global.fetch = async () => fakeFetchResponse(200, { id: 'prod_monthly_123' });
  const fakeRedis = createFakeRedis();
  const fakeBreaker = createSelfHealCircuitBreaker(fakeRedis);
  for (let i = 1; i < SELF_HEAL_TRIP_THRESHOLD; i++) {
    assert(`self-heal permitted (event ${i} of ${SELF_HEAL_TRIP_THRESHOLD - 1} allowed)`, (await guardedSelfHeal('test', fakeBreaker)) === true);
  }

  console.log('\n# guardedSelfHeal — the threshold-CROSSING event itself is blocked, not just later ones');
  assert(
    `event ${SELF_HEAL_TRIP_THRESHOLD} (crosses threshold) is BLOCKED, not permitted`,
    (await guardedSelfHeal('test', fakeBreaker)) === false
  );
  assert('breaker is now tripped', fakeRedis._get('polar:self-heal:tripped') === '1');
  assert('a subsequent event is also blocked while tripped', (await guardedSelfHeal('test', fakeBreaker)) === false);

  console.log('\n# guardedSelfHeal — circuit cooldown/expiry allows self-heal to resume');
  fakeRedis._clear('polar:self-heal:tripped');
  fakeRedis._clear('polar:self-heal:count'); // simulate the count window's own (shorter) TTL also having elapsed
  assert('self-heal resumes once both keys have expired (cooldown + window elapsed)', (await guardedSelfHeal('test', fakeBreaker)) === true);

  console.log('\n# guardedSelfHeal — concurrency: at most (threshold - 1) permitted no matter how many arrive at once');
  global.fetch = async () => fakeFetchResponse(200, { id: 'prod_monthly_123' });
  const concurrentBreaker = createSelfHealCircuitBreaker(createFakeRedis());
  const concurrentAttempts = 10;
  const results = await Promise.all(
    Array.from({ length: concurrentAttempts }, () => guardedSelfHeal('concurrent-test', concurrentBreaker))
  );
  const permittedCount = results.filter(Boolean).length;
  assert(
    `exactly ${SELF_HEAL_TRIP_THRESHOLD - 1} of ${concurrentAttempts} concurrent self-heals permitted (got ${permittedCount}) — the old check-then-act shape would have let more through`,
    permittedCount === SELF_HEAL_TRIP_THRESHOLD - 1
  );

  console.log('\n# guardedSelfHeal — known product unavailable blocks self-heal regardless of circuit state');
  global.fetch = async () => fakeFetchResponse(404, { detail: 'Not found' });
  const freshBreaker = createSelfHealCircuitBreaker(createFakeRedis()); // untripped, isolated from the above
  assert('self-heal blocked when environment check fails (breaker never even consulted)', (await guardedSelfHeal('test', freshBreaker)) === false);

  console.log('\n# guardedSelfHeal — Redis read failure fails closed');
  global.fetch = async () => fakeFetchResponse(200, { id: 'prod_monthly_123' }); // environment healthy
  const readFailBreaker = createSelfHealCircuitBreaker(createFakeRedis({ failGet: true }));
  assert('self-heal blocked when the breaker cannot READ its tripped flag', (await guardedSelfHeal('test', readFailBreaker)) === false);

  console.log('\n# guardedSelfHeal — Redis write/increment failure fails closed');
  const writeFailBreaker = createSelfHealCircuitBreaker(createFakeRedis({ failIncr: true }));
  assert('self-heal blocked when the breaker cannot WRITE its counter (previously this incorrectly permitted)', (await guardedSelfHeal('test', writeFailBreaker)) === false);

  console.log('\n# guardedSelfHeal — Redis fully unavailable fails closed (real breaker, no Upstash credentials in this script)');
  assert('self-heal blocked when the real circuit breaker cannot reach Redis', (await guardedSelfHeal('test')) === false);

  global.fetch = realFetch;
}

// ── MF-7: end-to-end handler tests ───────────────────────────────────────
// The tests above exercise guardedSelfHeal()/verifyPolarEnvironmentHealthy()
// directly, which proves the decision logic is correct in isolation — but
// not that switch.js/portal.js actually WIRE that decision to the real
// mutation. These tests require and invoke the REAL handler files (the
// exact code Vercel runs), with only the true I/O boundaries mocked:
// global.fetch (Polar), the circuit breaker's Redis client (via the
// __setSelfHealCircuitBreakerForTesting seam), and auth/rate-limiting/DB
// (via the same require.cache interception scripts/verify-account-deletion.js
// already established for this exact purpose — no new pattern introduced).
// api/_utils/polar.js itself is NEVER mocked here, so guardedSelfHeal(),
// verifyPolarEnvironmentHealthy(), isMissingResourceError(), and
// collapseToFreeAfterMissingSubscription() are all real, unmodified code.
function makeReqRes(body) {
  const req = { method: 'POST', headers: { authorization: 'Bearer faketoken' }, body };
  const res = {
    statusCode: null,
    body: null,
    setHeader() {},
    end(payload) {
      this.body = payload ? JSON.parse(payload) : null;
    },
  };
  return { req, res };
}

// Minimal fake Supabase supporting exactly the calls switch.js/portal.js
// make: .from(table).select().eq().maybeSingle() and .from(table).update().eq().
function createFakeSupabase({ subscription, profile } = {}) {
  const calls = { subscriptionUpdates: [] };
  return {
    calls,
    from(table) {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle: async () => {
          if (table === 'subscriptions') return { data: subscription ?? null, error: null };
          if (table === 'profiles') return { data: profile ?? null, error: null };
          return { data: null, error: null };
        },
        update: (patch) => {
          if (table === 'subscriptions') calls.subscriptionUpdates.push(patch);
          return {
            eq: async () => ({ error: null }),
          };
        },
      };
    },
  };
}

function loadHandlerWithMocks(handlerRelativePath, { subscription, profile, fetchImpl }) {
  const supabaseAdminPath = require.resolve('../api/_utils/supabaseAdmin');
  const rateLimitPath = require.resolve('../api/_utils/rateLimit');
  const handlerPath = require.resolve(handlerRelativePath);

  for (const p of [supabaseAdminPath, rateLimitPath, handlerPath]) {
    delete require.cache[p];
  }

  const fakeSupabase = createFakeSupabase({ subscription, profile });

  require.cache[supabaseAdminPath] = {
    id: supabaseAdminPath,
    filename: supabaseAdminPath,
    loaded: true,
    exports: {
      getAuthenticatedUser: async () => ({
        supabase: fakeSupabase,
        user: { id: 'user-1', email: 'user@example.com' },
      }),
    },
  };

  require.cache[rateLimitPath] = {
    id: rateLimitPath,
    filename: rateLimitPath,
    loaded: true,
    exports: { rateLimit: async () => true },
  };

  global.fetch = fetchImpl;

  // api/_utils/polar.js and api/_utils/http.js are deliberately left
  // exactly as normal `require` resolves them — real code, real
  // guardedSelfHeal, real collapseToFreeAfterMissingSubscription.
  return { handler: require(handlerPath), fakeSupabase };
}

async function runFullHandlerTests() {
  const realFetch = global.fetch;

  console.log('\n# switch.js (real handler) — A: healthy environment + genuinely stale subscription -> self-heal mutates');
  {
    __setSelfHealCircuitBreakerForTesting(createSelfHealCircuitBreaker(createFakeRedis()));
    const { handler, fakeSupabase } = loadHandlerWithMocks('../api/polar/switch', {
      subscription: { polar_subscription_id: 'sub_stale_123', plan: 'pro_monthly', status: 'active' },
      fetchImpl: async (url) => {
        if (String(url).includes('/v1/products/')) return fakeFetchResponse(200, { id: 'prod' }); // Layer 1: environment healthy
        if (String(url).includes('/v1/subscriptions/sub_stale_123')) return fakeFetchResponse(404, { detail: 'Not found' }); // genuinely stale row
        throw new Error('unexpected fetch: ' + url);
      },
    });
    const { req, res } = makeReqRes({ plan: 'pro_yearly' });
    await handler(req, res);
    assert('scenario A: responds 409 (moved to Free)', res.statusCode === 409);
    assert('scenario A: subscriptions.update WAS called (self-heal mutated)', fakeSupabase.calls.subscriptionUpdates.length === 1);
    assert(
      'scenario A: update payload collapses to free/canceled',
      fakeSupabase.calls.subscriptionUpdates[0]?.plan === 'free' && fakeSupabase.calls.subscriptionUpdates[0]?.status === 'canceled'
    );
  }

  console.log('\n# switch.js (real handler) — B: misconfigured environment -> self-heal suppressed, paid state NOT mutated');
  {
    __setSelfHealCircuitBreakerForTesting(createSelfHealCircuitBreaker(createFakeRedis()));
    const { handler, fakeSupabase } = loadHandlerWithMocks('../api/polar/switch', {
      subscription: { polar_subscription_id: 'sub_real_but_wrong_env', plan: 'pro_monthly', status: 'active' },
      fetchImpl: async () => fakeFetchResponse(404, { detail: 'Not found' }), // EVERYTHING 404s: product check included
    });
    const { req, res } = makeReqRes({ plan: 'pro_yearly' });
    await handler(req, res);
    assert('scenario B: responds 502 (retryable, not a downgrade)', res.statusCode === 502);
    assert('scenario B: subscriptions.update was NEVER called (paid state preserved)', fakeSupabase.calls.subscriptionUpdates.length === 0);
  }

  console.log('\n# switch.js (real handler) — C: healthy environment but circuit already tripped -> NOT mutated');
  {
    const trippedRedis = createFakeRedis();
    await trippedRedis.set('polar:self-heal:tripped', '1');
    __setSelfHealCircuitBreakerForTesting(createSelfHealCircuitBreaker(trippedRedis));
    const { handler, fakeSupabase } = loadHandlerWithMocks('../api/polar/switch', {
      subscription: { polar_subscription_id: 'sub_stale_123', plan: 'pro_monthly', status: 'active' },
      fetchImpl: async (url) => {
        if (String(url).includes('/v1/products/')) return fakeFetchResponse(200, { id: 'prod' }); // environment IS healthy
        if (String(url).includes('/v1/subscriptions/')) return fakeFetchResponse(404, { detail: 'Not found' });
        throw new Error('unexpected fetch: ' + url);
      },
    });
    const { req, res } = makeReqRes({ plan: 'pro_yearly' });
    await handler(req, res);
    assert('scenario C: responds 502 even though environment is healthy (circuit breaker governs independently)', res.statusCode === 502);
    assert('scenario C: subscriptions.update was NEVER called', fakeSupabase.calls.subscriptionUpdates.length === 0);
  }

  console.log('\n# portal.js (real handler) — D: healthy environment + stale customer -> full recovery sequence runs and syncs the new id');
  {
    __setSelfHealCircuitBreakerForTesting(createSelfHealCircuitBreaker(createFakeRedis()));
    const polarCalls = { customerSearch: 0, customerCreate: 0, customerSession: 0 };
    const { handler, fakeSupabase } = loadHandlerWithMocks('../api/polar/portal', {
      subscription: { polar_customer_id: 'cus_stale_123' },
      profile: { full_name: 'Test User' },
      fetchImpl: async (url, opts = {}) => {
        const u = String(url);
        if (u.includes('/v1/products/')) return fakeFetchResponse(200, { id: 'prod' }); // Layer 1: healthy
        if (u.includes('/v1/customer-sessions/')) {
          polarCalls.customerSession += 1;
          const body = JSON.parse(opts.body || '{}');
          // Both initial attempts (stored id, external_customer_id) fail --
          // simulates a customer that only ever existed in a different
          // Polar environment. The recovery's own session call (for the
          // newly-created customer) succeeds.
          if (body.customer_id === 'cus_recovered_456') {
            return fakeFetchResponse(200, { customer_id: 'cus_recovered_456', customer_portal_url: 'https://polar.sh/portal/xyz' });
          }
          return fakeFetchResponse(404, { detail: 'Not found' });
        }
        if (u.includes('/v1/customers/?email=')) {
          polarCalls.customerSearch += 1;
          return fakeFetchResponse(200, { items: [] }); // no existing customer under this environment
        }
        if (u.includes('/v1/customers/')) {
          polarCalls.customerCreate += 1;
          return fakeFetchResponse(200, { id: 'cus_recovered_456' });
        }
        throw new Error('unexpected fetch: ' + url);
      },
    });
    const { req, res } = makeReqRes({});
    await handler(req, res);
    assert('scenario D: responds 200 with a portal url', res.statusCode === 200 && Boolean(res.body?.url));
    assert('scenario D: email search ran', polarCalls.customerSearch === 1);
    assert('scenario D: customer create ran (email search found nothing)', polarCalls.customerCreate === 1);
    assert('scenario D: recovery customer-session ran', polarCalls.customerSession === 3); // 2 failed initial attempts (polar_customer_id + external_customer_id) + 1 recovered
    assert(
      'scenario D: polar_customer_id sync-back WAS written with the recovered id',
      fakeSupabase.calls.subscriptionUpdates.some((p) => p.polar_customer_id === 'cus_recovered_456')
    );
  }

  console.log('\n# portal.js (real handler) — E: misconfigured environment -> NO customer created, NO sync-back write');
  {
    __setSelfHealCircuitBreakerForTesting(createSelfHealCircuitBreaker(createFakeRedis()));
    const polarCalls = { customerSearch: 0, customerCreate: 0 };
    const { handler, fakeSupabase } = loadHandlerWithMocks('../api/polar/portal', {
      subscription: { polar_customer_id: 'cus_stale_123' },
      profile: { full_name: 'Test User' },
      fetchImpl: async (url) => {
        const u = String(url);
        if (u.includes('/v1/customers/?email=')) polarCalls.customerSearch += 1;
        if (u.includes('/v1/customers/') && !u.includes('?email=')) polarCalls.customerCreate += 1;
        return fakeFetchResponse(404, { detail: 'Not found' }); // EVERYTHING 404s: product check included
      },
    });
    const { req, res } = makeReqRes({});
    await handler(req, res);
    assert('scenario E: responds 502 (retryable)', res.statusCode === 502);
    assert('scenario E: email search never ran (guard blocked before the recovery block)', polarCalls.customerSearch === 0);
    assert('scenario E: no new customer was created', polarCalls.customerCreate === 0);
    assert('scenario E: no DB write occurred', fakeSupabase.calls.subscriptionUpdates.length === 0);
  }

  global.fetch = realFetch;
}

// ── Catalog drift guard ──────────────────────────────────────────────────
// The plan catalog lives in two runtime-appropriate places: the frontend's
// config/plans.js (ESM, full display data) and api/_utils/planCatalog.js (CJS,
// the server projection). They must never disagree on WHICH plans exist or
// their billing interval. Dynamically import the frontend catalog (it's pure
// data) and assert parity, so a plan added to one file but not the other fails
// CI instead of silently shipping a half-wired plan.
runSelfHealTests().then(() => runFullHandlerTests()).then(() => {
  console.log('\n# Plan catalog drift (frontend config/plans.js vs backend planCatalog.js)');
  return import('../frontend/src/config/plans.js')
    .then((fe) => {
      const { PLAN_CATALOG, planIds } = require('../api/_utils/planCatalog.js');
      const feIds = fe.planCatalog.map((p) => p.id).sort();
      const beIds = planIds().sort();
      assert('plan id sets match', JSON.stringify(feIds) === JSON.stringify(beIds));

      const beInterval = Object.fromEntries(PLAN_CATALOG.map((p) => [p.id, p.interval ?? null]));
      const intervalsMatch = fe.planCatalog.every((p) => beInterval[p.id] === (p.interval ?? null));
      assert('plan intervals match per id', intervalsMatch);
    })
    .catch((err) => {
      assert('frontend catalog importable for drift check (' + err.message + ')', false);
    });
}).catch((err) => {
  assert('MF-7 self-heal test suite ran without throwing (' + err.message + ')', false);
  console.error(err.stack);
}).finally(() => {
  console.log(`\n==== ${pass} passed, ${fail} failed ====`);
  process.exit(fail === 0 ? 0 : 1);
});
