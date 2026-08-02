#!/usr/bin/env node
/**
 * Framework-free verification for account-deletion logic — runs with plain
 * `node`, no test runner required:
 *
 *   node scripts/verify-account-deletion.js   (or: npm run verify:account-deletion)
 *
 * Covers the pure logic in api/_utils/account.js (confirmation matching,
 * the subscription-revocation decision, storage path construction) plus a
 * mocked full run of the api/account/delete.js handler's control flow —
 * billing-failure abort, DB-failure abort, storage-failure tolerance,
 * auth-failure reporting, and the full happy path — using a hand-rolled
 * fake Supabase client (no test framework dependency, matching
 * verify-polar.js's approach).
 *
 * What this CANNOT verify (needs a live Supabase project + Polar sandbox,
 * unavailable in this environment — same standing gap as verify-polar.js):
 * the actual RLS/FK behavior of the delete_user_account SQL function
 * against a real Postgres database, real Supabase Storage list/remove
 * calls, and a real Polar subscription revocation.
 */

process.env.POLAR_SERVER = process.env.POLAR_SERVER || 'sandbox';
process.env.POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN || 'polar_oat_test';

const {
  matchesDeleteConfirmation,
  needsSubscriptionRevocation,
  userStoragePath,
} = require('../api/_utils/account');
const { hasAccessGrantingStatus } = require('../api/_utils/polar');

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass++;
    console.log('  ok  -', name);
  } else {
    fail++;
    console.log(' FAIL -', name);
  }
}

console.log('\n# matchesDeleteConfirmation');
check('exact "DELETE" matches', matchesDeleteConfirmation('DELETE', 'user@example.com') === true);
check('lowercase "delete" does NOT match (case-sensitive keyword)', matchesDeleteConfirmation('delete', 'user@example.com') === false);
check('own email matches, case-insensitive', matchesDeleteConfirmation('USER@Example.COM', 'user@example.com') === true);
check('own email with surrounding whitespace matches (trimmed)', matchesDeleteConfirmation('  user@example.com  ', 'user@example.com') === true);
check('someone else\'s email does not match', matchesDeleteConfirmation('other@example.com', 'user@example.com') === false);
check('empty string does not match', matchesDeleteConfirmation('', 'user@example.com') === false);
check('whitespace-only does not match', matchesDeleteConfirmation('   ', 'user@example.com') === false);
check('garbage text does not match', matchesDeleteConfirmation('delete my account please', 'user@example.com') === false);
check('non-string input does not match/throw', matchesDeleteConfirmation(undefined, 'user@example.com') === false);
check('null email + DELETE keyword still matches (keyword path independent of email)', matchesDeleteConfirmation('DELETE', null) === true);

console.log('\n# needsSubscriptionRevocation');
check('free plan -> no revocation', needsSubscriptionRevocation({ plan: 'free', status: 'active', polar_subscription_id: 'sub_1' }, hasAccessGrantingStatus) === false);
check('no subscription row at all -> no revocation', needsSubscriptionRevocation(null, hasAccessGrantingStatus) === false);
check('pro + active + has id -> revoke', needsSubscriptionRevocation({ plan: 'pro_monthly', status: 'active', polar_subscription_id: 'sub_1' }, hasAccessGrantingStatus) === true);
check('pro + trialing + has id -> revoke', needsSubscriptionRevocation({ plan: 'pro_yearly', status: 'trialing', polar_subscription_id: 'sub_1' }, hasAccessGrantingStatus) === true);
check('pro + past_due + has id -> revoke (still access-granting)', needsSubscriptionRevocation({ plan: 'pro_monthly', status: 'past_due', polar_subscription_id: 'sub_1' }, hasAccessGrantingStatus) === true);
check('pro + canceled -> no revocation (already not access-granting)', needsSubscriptionRevocation({ plan: 'pro_monthly', status: 'canceled', polar_subscription_id: 'sub_1' }, hasAccessGrantingStatus) === false);
check('pro + active but NO polar_subscription_id -> no revocation (nothing to revoke)', needsSubscriptionRevocation({ plan: 'pro_monthly', status: 'active', polar_subscription_id: null }, hasAccessGrantingStatus) === false);

console.log('\n# userStoragePath');
check('builds "<userId>/<filename>"', userStoragePath('user-123', 'logo-999.png') === 'user-123/logo-999.png');

// ---------------------------------------------------------------------
// Mocked end-to-end handler runs. We intercept the modules
// api/account/delete.js requires via Module._cache before first require,
// so the real handler's own control flow runs against fakes — no test
// framework, no live network, no live database.
// ---------------------------------------------------------------------
console.log('\n# api/account/delete.js handler (mocked dependencies)');

function makeReqRes(body) {
  const req = { method: 'POST', headers: { authorization: 'Bearer faketoken' }, body };
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    end(payload) { this.body = payload ? JSON.parse(payload) : null; },
  };
  return { req, res };
}

function loadHandlerWithMocks({
  subscription,
  rpcError,
  deleteUserError,
  storageListError,
  listedFiles = [],
  polarFetchImpl,
}) {
  const httpUtilPath = require.resolve('../api/_utils/http');
  const supabaseAdminPath = require.resolve('../api/_utils/supabaseAdmin');
  const polarPath = require.resolve('../api/_utils/polar');
  const rateLimitPath = require.resolve('../api/_utils/rateLimit');
  const handlerPath = require.resolve('../api/account/delete');

  // Clear any previously-cached copies so each scenario gets a fresh mock.
  for (const p of [httpUtilPath, supabaseAdminPath, polarPath, rateLimitPath, handlerPath]) {
    delete require.cache[p];
  }

  const calls = { rpc: 0, storageList: 0, storageRemove: 0, authDelete: 0, polarFetch: 0 };

  const fakeSupabase = {
    from(table) {
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle: async () => {
          if (table === 'subscriptions') return { data: subscription, error: null };
          return { data: null, error: null };
        },
      };
    },
    rpc: async () => {
      calls.rpc += 1;
      return rpcError ? { error: { message: rpcError } } : { error: null };
    },
    storage: {
      from() {
        return {
          list: async () => {
            calls.storageList += 1;
            return storageListError ? { data: null, error: { message: storageListError } } : { data: listedFiles, error: null };
          },
          remove: async () => {
            calls.storageRemove += 1;
            return { error: null };
          },
        };
      },
    },
    auth: {
      admin: {
        deleteUser: async () => {
          calls.authDelete += 1;
          return deleteUserError ? { error: { message: deleteUserError } } : { error: null };
        },
      },
    },
  };

  require.cache[supabaseAdminPath] = {
    id: supabaseAdminPath,
    filename: supabaseAdminPath,
    loaded: true,
    exports: {
      getAuthenticatedUser: async () => ({ supabase: fakeSupabase, user: { id: 'user-123', email: 'user@example.com' } }),
    },
  };

  require.cache[rateLimitPath] = {
    id: rateLimitPath,
    filename: rateLimitPath,
    loaded: true,
    exports: { rateLimit: async () => true },
  };

  const realPolar = require('../api/_utils/polar');
  require.cache[polarPath] = {
    id: polarPath,
    filename: polarPath,
    loaded: true,
    exports: {
      ...realPolar,
      polarFetch: async (...args) => {
        calls.polarFetch += 1;
        if (polarFetchImpl) return polarFetchImpl(...args);
        throw Object.assign(new Error('mock: polarFetch called without an explicit polarFetchImpl'), { status: 500 });
      },
    },
  };

  return { handler: require(handlerPath), calls };
}

(async () => {
  // Scenario 1: happy path, free plan, no files — the simplest full run.
  {
    const { handler } = loadHandlerWithMocks({ subscription: { plan: 'free', status: 'active', polar_subscription_id: null } });
    const { req, res } = makeReqRes({ confirmation: 'DELETE' });
    await handler(req, res);
    check('happy path (free plan): 200 success', res.statusCode === 200 && res.body?.success === true);
  }

  // Scenario 2: wrong confirmation text never reaches any destructive step.
  {
    const { handler } = loadHandlerWithMocks({ subscription: { plan: 'free', status: 'active', polar_subscription_id: null } });
    const { req, res } = makeReqRes({ confirmation: 'delete my account' });
    await handler(req, res);
    check('wrong confirmation: 400, rejected before any deletion', res.statusCode === 400 && !res.body?.success);
  }

  // Scenario 3: DB failure aborts cleanly with a clear message, before storage/auth are touched.
  {
    const { handler, calls } = loadHandlerWithMocks({
      subscription: { plan: 'free', status: 'active', polar_subscription_id: null },
      rpcError: 'simulated database failure',
    });
    const { req, res } = makeReqRes({ confirmation: 'DELETE' });
    await handler(req, res);
    check('database failure: 500, explicit "nothing changed" message', res.statusCode === 500 && /nothing was changed/i.test(res.body?.error || ''));
    check('database failure: storage/auth were never touched after the RPC failed', calls.storageList === 0 && calls.authDelete === 0);
  }

  // Scenario 4: storage failure is best-effort — deletion still completes.
  {
    const { handler, calls } = loadHandlerWithMocks({
      subscription: { plan: 'free', status: 'active', polar_subscription_id: null },
      storageListError: 'simulated storage outage',
    });
    const { req, res } = makeReqRes({ confirmation: 'DELETE' });
    await handler(req, res);
    check('storage failure: does not block overall success (best-effort cleanup)', res.statusCode === 200 && res.body?.success === true);
    check('storage failure: auth deletion still ran afterward', calls.authDelete === 1);
  }

  // Scenario 5: auth deletion failure is reported distinctly (data already gone).
  {
    const { handler, calls } = loadHandlerWithMocks({
      subscription: { plan: 'free', status: 'active', polar_subscription_id: null },
      deleteUserError: 'simulated auth outage',
    });
    const { req, res } = makeReqRes({ confirmation: 'DELETE' });
    await handler(req, res);
    check('auth deletion failure: 500, message clarifies data was already deleted', res.statusCode === 500 && /data has been deleted/i.test(res.body?.error || ''));
    check('auth deletion failure: the RPC had already run by that point', calls.rpc === 1);
  }

  // Scenario 6: "deleting twice" — a second call with an already-empty account
  // still succeeds cleanly (every underlying operation is idempotent: 0 rows
  // deleted is not an error, an empty storage folder is not an error).
  {
    const { handler } = loadHandlerWithMocks({ subscription: null }); // no subscription row left at all
    const { req, res } = makeReqRes({ confirmation: 'DELETE' });
    await handler(req, res);
    check('repeat deletion on an already-empty account: still 200 (idempotent)', res.statusCode === 200 && res.body?.success === true);
  }

  // Scenario 7: GET/other methods rejected.
  {
    const { handler } = loadHandlerWithMocks({ subscription: { plan: 'free', status: 'active', polar_subscription_id: null } });
    const { req, res } = makeReqRes(undefined);
    req.method = 'GET';
    await handler(req, res);
    check('GET request: 405 method not allowed', res.statusCode === 405);
  }

  // Scenario 8: active Pro subscription — Polar revocation is called, then
  // the rest of the flow proceeds normally.
  {
    const { handler, calls } = loadHandlerWithMocks({
      subscription: { plan: 'pro_monthly', status: 'active', polar_subscription_id: 'sub_live_1' },
      polarFetchImpl: async () => ({}),
    });
    const { req, res } = makeReqRes({ confirmation: 'DELETE' });
    await handler(req, res);
    check('Pro subscription: Polar revocation called exactly once', calls.polarFetch === 1);
    check('Pro subscription: full deletion still completes', res.statusCode === 200 && res.body?.success === true);
  }

  // Scenario 9: billing cancellation fails (non-404) — MUST abort before any
  // data is touched. This is the single most important safety property in
  // the whole endpoint (never destroy data while billing might still be live).
  {
    const { handler, calls } = loadHandlerWithMocks({
      subscription: { plan: 'pro_monthly', status: 'active', polar_subscription_id: 'sub_live_1' },
      polarFetchImpl: async () => { throw Object.assign(new Error('Polar is down'), { status: 500 }); },
    });
    const { req, res } = makeReqRes({ confirmation: 'DELETE' });
    await handler(req, res);
    check('billing revocation failure: 502, nothing deleted yet', res.statusCode === 502);
    check('billing revocation failure: database RPC was never called', calls.rpc === 0);
    check('billing revocation failure: storage was never touched', calls.storageList === 0);
    check('billing revocation failure: auth user was never deleted', calls.authDelete === 0);
  }

  // Scenario 10: Polar 404 (stale/already-canceled subscription) is treated
  // as already-handled, not an error — deletion proceeds.
  {
    const { handler, calls } = loadHandlerWithMocks({
      subscription: { plan: 'pro_yearly', status: 'active', polar_subscription_id: 'sub_stale' },
      polarFetchImpl: async () => { throw Object.assign(new Error('not found'), { status: 404 }); },
    });
    const { req, res } = makeReqRes({ confirmation: 'DELETE' });
    await handler(req, res);
    check('stale Polar subscription (404): treated as already-canceled, deletion proceeds', res.statusCode === 200 && res.body?.success === true);
    check('stale Polar subscription (404): database RPC still ran', calls.rpc === 1);
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
