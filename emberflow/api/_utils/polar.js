const crypto = require('crypto');
const { Webhook, WebhookVerificationError } = require('standardwebhooks');
const { Redis } = require('@upstash/redis');
const { BILLING_CYCLE_BY_INTERVAL, billablePlans, planById } = require('./planCatalog');

// Polar subscription statuses that still grant access to paid features.
const ACCESS_GRANTING_STATUSES = new Set(['active', 'trialing', 'past_due']);

function hasAccessGrantingStatus(status) {
  return ACCESS_GRANTING_STATUSES.has(status);
}

// The documented/canonical var is POLAR_SERVER (see .env.example, POLAR_SETUP.md).
// POLAR_ENVIRONMENT is accepted as a fallback only because a deploy was found
// configured with that name instead — the code has never read it otherwise.
// Warn loudly so this doesn't silently strand production on the sandbox API.
function getPolarServer() {
  if (process.env.POLAR_SERVER) return process.env.POLAR_SERVER;
  if (process.env.POLAR_ENVIRONMENT) {
    console.error(
      'POLAR_ENVIRONMENT is set but EmberFlow reads POLAR_SERVER. ' +
      'Rename it in Vercel (Settings > Environment Variables) and redeploy — ' +
      'until then this falls back to POLAR_ENVIRONMENT, which is undocumented.'
    );
    return process.env.POLAR_ENVIRONMENT;
  }
  return undefined;
}

function polarBaseUrl() {
  return getPolarServer() === 'production'
    ? 'https://api.polar.sh'
    : 'https://sandbox-api.polar.sh';
}

// Resolve a plan id to its live Polar product id. Data-driven off the plan
// catalog: any plan with a productEnvVar is billable; anything else (or an
// unknown id) is rejected. Polar checkout is created from PRODUCT ids.
function getProductId(plan) {
  if (typeof plan !== 'string') {
    throw new Error('Invalid billing plan.');
  }

  const def = planById(plan);
  if (!def || !def.productEnvVar) throw new Error('Unsupported billing plan.');
  const productId = process.env[def.productEnvVar];
  if (!productId) throw new Error(`Missing ${def.productEnvVar}.`);
  return productId;
}

// Reverse map: a Polar product id back to our plan id. Matches against every
// billable plan's configured product env value; unknown products collapse to
// free (so a product we don't recognize never grants paid access).
function planFromProduct(productId) {
  if (!productId) return 'free';
  const match = billablePlans().find((p) => process.env[p.productEnvVar] === productId);
  return match ? match.id : 'free';
}

function billingCycleFromPlan(plan) {
  const def = planById(plan);
  if (!def) return 'free';
  return BILLING_CYCLE_BY_INTERVAL[def.interval] || 'free';
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
  // envelope), so callers use the returned payload as-is.
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(`Polar API Error: ${options.method || 'GET'} ${path} -> ${response.status}`);
    console.error(JSON.stringify(payload, null, 2));
    // Polar's error body is usually { detail: "..." } (a string) but for
    // 422s detail is an array of { type, loc, msg } validation objects —
    // stringify the whole payload in that case rather than losing it.
    const error = new Error(
      typeof payload?.detail === 'string'
        ? payload.detail
        : JSON.stringify(payload?.detail || payload?.error || payload)
    );
    // Attached (not just logged) so callers can distinguish "this customer/
    // resource genuinely doesn't exist in the current Polar environment"
    // (404 — worth recovering from) from auth/config/rate-limit failures
    // (worth surfacing as-is, not papering over with a recovery attempt).
    error.status = response.status;
    throw error;
  }

  return payload;
}

// Polar signs every webhook per the Standard Webhooks spec. Its signing
// secret is a plain string; the Standard Webhooks verifier expects a base64
// secret that it base64-decodes back into the HMAC key, so we base64-encode
// it first — identical to what @polar-sh/sdk does internally (verified
// directly against polarsource/polar-js's webhooks.ts, and Polar's own docs
// call this out as "a common gotcha with the spec"). verify() also enforces
// the required webhook-id/webhook-timestamp/webhook-signature headers, a
// 5-minute timestamp tolerance (replay protection), and a constant-time
// comparison. It throws WebhookVerificationError on failure and returns the
// parsed (snake_case) event payload on success.
function verifyPolarWebhook(rawBody, headers) {
  // .trim() guards against the single most common real-world cause of a
  // secret that "looks right" but never verifies: a trailing newline/space
  // picked up when copying the signing secret out of the Polar dashboard.
  const secret = (process.env.POLAR_WEBHOOK_SECRET || '').trim();
  if (!secret) throw new Error('Missing POLAR_WEBHOOK_SECRET.');
  const webhook = new Webhook(Buffer.from(secret, 'utf-8').toString('base64'));
  return webhook.verify(rawBody, headers);
}

// Diagnostic only — never logs the secret itself. Lets whoever is looking at
// Vercel's function logs confirm, without ever printing the real value,
// whether the POLAR_WEBHOOK_SECRET actually configured matches the one shown
// in the Polar dashboard for the endpoint that's delivering (sandbox and
// production endpoints each have their own distinct secret): compute
// sha256(trimmed secret) locally from the dashboard value and compare its
// first 12 hex chars against `sha256Prefix` below.
function describeConfiguredWebhookSecret() {
  const raw = process.env.POLAR_WEBHOOK_SECRET || '';
  const trimmed = raw.trim();
  if (!trimmed) return { configured: false };
  return {
    configured: true,
    length: trimmed.length,
    hadWhitespace: trimmed.length !== raw.length,
    sha256Prefix: crypto.createHash('sha256').update(trimmed).digest('hex').slice(0, 12),
  };
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
  const grantsAccess = hasAccessGrantingStatus(status);
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

// A stored polar_subscription_id that 404s against the currently configured
// Polar environment almost certainly means the row is stale (e.g. captured
// before a sandbox -> production cutover, or the subscription was deleted
// directly in Polar) rather than a transient failure — the same class of
// issue api/polar/portal.js recovers from for polar_customer_id. Left alone,
// the row would stay frozen at whatever access-granting status it had
// forever, since no further webhook can ever arrive for a subscription that
// doesn't exist in the current environment — silently granting Pro access
// indefinitely. Self-heal by collapsing to Free so EmberFlow's own state
// matches reality, and clearing the dead id per the same "never keep an id
// we know is invalid" rule (polar_customer_id is left alone -- portal.js's
// own recovery already re-syncs it the next time it's needed).
async function collapseToFreeAfterMissingSubscription(supabase, userId) {
  const { error } = await supabase
    .from('subscriptions')
    .update({ plan: 'free', status: 'canceled', polar_subscription_id: null })
    .eq('user_id', userId);
  if (error) console.error('Failed to collapse stale subscription to free:', error.message);
}

// ── MF-7: self-heal circuit breaker ─────────────────────────────────────
//
// collapseToFreeAfterMissingSubscription() above (and portal.js's parallel
// "recreate the Polar customer" recovery) both act on a single 404 as if it
// were proof that one specific row is stale. It isn't: this project has
// already hit a real incident (see getPolarServer() above) where
// POLAR_SERVER/POLAR_ACCESS_TOKEN pointed at the wrong Polar environment,
// which makes EVERY id 404 -- sandbox and production are fully separate
// customer/subscription/product databases, so a well-formed, correctly-
// signed 404 from Polar's real API is not distinguishable, per request,
// from "this environment is misconfigured." Two things gate any self-heal
// now, both of which have to agree before switch.js/cancel.js/portal.js are
// allowed to mutate anything:

// Layer 1 (primary): can THIS environment currently resolve every resource
// we know for certain exists -- EVERY one of EmberFlow's own configured
// billable product ids, not just whichever one happens to be first. Checking
// only one would let a *partial* misconfiguration (e.g. only
// POLAR_PRODUCT_PRO_MONTHLY was copied from the wrong environment, YEARLY is
// fine) slip through on whichever product happens to still resolve --
// requiring all configured ids to resolve closes that gap. Re-querying the
// SAME subscription/customer id a second time would only reproduce the SAME
// environmental failure and prove nothing new; this asks a structurally
// different question instead: a misconfigured environment fails these
// lookups uniformly (it can't see its own real products any more than the
// user's row), while a genuinely stale row fails only the specific lookup --
// the environment itself is fine. That asymmetry is what makes this
// diagnostic. Both calls go through the exact same polarFetch() (same
// polarBaseUrl()/POLAR_ACCESS_TOKEN) as the original failing lookup, so this
// is bound to the identical effective configuration, not a separate one.
// Read-only; requires the `products (read)` scope POLAR_SETUP.md already
// documents as required.
async function verifyPolarEnvironmentHealthy() {
  const knownGoodProductIds = billablePlans()
    .map((p) => process.env[p.productEnvVar])
    .filter(Boolean);
  if (knownGoodProductIds.length === 0) return false; // nothing configured to check against

  const results = await Promise.allSettled(
    knownGoodProductIds.map((id) => polarFetch(`/v1/products/${id}`))
  );
  // Any failure -- 404, 401/403, 5xx, network -- on ANY configured product
  // means this environment cannot currently be trusted to tell us a
  // resource is truly gone.
  return results.every((r) => r.status === 'fulfilled');
}

// Layer 2 (defense-in-depth): even when Layer 1 passes for one request, a
// misconfiguration could still slip past it in some edge case Layer 1
// doesn't cover. Track how many times ANY of switch/cancel/portal have
// actually decided to self-heal across a short rolling window, independent
// of user; if that count crosses a small threshold, something is wrong at
// the environment level, not N independent stale rows (independent
// staleness is inherently rare and uncorrelated) -- so stop self-healing
// entirely for a cooldown period and log a single unmistakable alert.
const SELF_HEAL_COUNT_KEY = 'polar:self-heal:count';
const SELF_HEAL_TRIPPED_KEY = 'polar:self-heal:tripped';
const SELF_HEAL_WINDOW_SECONDS = 600; // 10 minutes
const SELF_HEAL_TRIP_THRESHOLD = 3; // distinct self-heal events within the window
const SELF_HEAL_COOLDOWN_SECONDS = 1800; // 30 minutes once tripped

// Pure and isolated from Redis I/O on purpose, so the trip arithmetic is
// directly unit-testable (scripts/verify-polar.js) without a live client.
// `countAfterIncrement` is the value an ATOMIC incr just returned for THIS
// caller -- see the race-condition note on evaluate() below for why the
// decision must be derived from that value specifically, not from a
// separately-read flag.
function shouldTripCircuit(countAfterIncrement) {
  return countAfterIncrement >= SELF_HEAL_TRIP_THRESHOLD;
}

// Bound to an injectable client so tests can swap in an in-memory fake
// store; production code calls this with no argument and gets the real
// Upstash-backed instance below.
function createSelfHealCircuitBreaker(client) {
  return {
    // Single entry point -- deliberately NOT split into a separate
    // isTripped()-then-recordEvent() pair. That two-step shape is a
    // check-then-act race: under concurrent requests, several could all
    // read "not tripped" before any of them had written anything, letting
    // more than the intended threshold's worth of mutations through before
    // the breaker visibly trips. evaluate() closes this by deriving the
    // permit/deny decision from the return value of a single ATOMIC
    // Redis INCR, which Upstash/Redis guarantees is strictly serialized per
    // key even under concurrency -- every concurrent caller gets a unique,
    // sequential integer back, so AT MOST (threshold - 1) callers can ever
    // observe a value below the threshold, regardless of how many requests
    // arrive at once. The one exception is the already-tripped fast path
    // below, which is a plain read used only to skip incrementing once the
    // outcome is already decided (and to correctly enforce the cooldown
    // window after the count key's own shorter window has expired) -- it is
    // never the sole basis for a *permit* decision, only ever for an
    // additional, redundant *deny*.
    async evaluate() {
      // Fast path: already tripped from an earlier event in this cooldown.
      // A stale/racy read here can only cause an unnecessary extra incr
      // below (harmless), never a false permit, so it doesn't need to be
      // atomic with what follows.
      try {
        if (await client.get(SELF_HEAL_TRIPPED_KEY)) {
          return { permitted: false, reason: 'circuit-open' };
        }
      } catch (err) {
        // Fails CLOSED, unlike rateLimit.js's fail-open: an unreadable rate
        // limiter just lets a few extra requests through, but an unreadable
        // circuit breaker here must not silently permit the exact
        // destructive mutation it exists to gate.
        console.error('Polar self-heal circuit breaker unavailable (failing closed):', err.message);
        return { permitted: false, reason: 'redis-read-failed' };
      }

      let count;
      try {
        count = await client.incr(SELF_HEAL_COUNT_KEY);
        if (count === 1) await client.expire(SELF_HEAL_COUNT_KEY, SELF_HEAL_WINDOW_SECONDS);
      } catch (err) {
        // A failed increment must ALSO fail closed -- if we can't reliably
        // count this event, we cannot claim it's safely under the
        // threshold. Previously this was a background, log-only failure
        // that still let the caller through; that gap is closed here.
        console.error('Polar self-heal circuit breaker failed to record event (failing closed):', err.message);
        return { permitted: false, reason: 'redis-write-failed' };
      }

      if (shouldTripCircuit(count)) {
        // The event that CROSSES the threshold is itself denied, not just
        // the ones after it -- so at most (threshold - 1) self-heals can
        // ever be permitted per window, no matter how many arrive at once.
        try {
          await client.set(SELF_HEAL_TRIPPED_KEY, '1', { ex: SELF_HEAL_COOLDOWN_SECONDS });
        } catch (err) {
          // Best-effort: even if persisting the flag fails, THIS event is
          // still correctly denied below because the decision is already
          // derived from `count`, not from the flag write's success.
          console.error('Polar self-heal circuit breaker failed to persist tripped flag:', err.message);
        }
        console.error(
          `ALERT: Polar self-heal circuit breaker TRIPPED -- ${count} self-heal events within ` +
          `${SELF_HEAL_WINDOW_SECONDS}s. Suppressing further self-heals for ${SELF_HEAL_COOLDOWN_SECONDS}s. ` +
          'Multiple distinct self-heals in a short window is far more consistent with a ' +
          'POLAR_SERVER/config incident than independent stale rows -- investigate before relying on ' +
          'self-heal again.'
        );
        return { permitted: false, reason: 'threshold-reached' };
      }

      return { permitted: true };
    },
  };
}

let selfHealCircuitBreaker = createSelfHealCircuitBreaker(
  new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
);

// Test-only seam: lets scripts/verify-polar.js point guardedSelfHeal()'s
// default breaker at an in-memory fake so the full switch.js/cancel.js/
// portal.js handlers can be exercised end-to-end without live Upstash
// credentials. Never called from production code.
function __setSelfHealCircuitBreakerForTesting(breaker) {
  selfHealCircuitBreaker = breaker;
}

// Centralizes the "is this error eligible for 404-triggered self-heal"
// check switch.js/cancel.js/portal.js each need -- one definition, directly
// testable against 401/403/5xx/network-shaped errors, and the only change
// to what counts as self-heal-eligible (none: still exactly status 404).
function isMissingResourceError(err) {
  return Boolean(err) && err.status === 404;
}

// The single entry point switch.js/cancel.js/portal.js call instead of
// mutating directly on a 404. Returns whether it's safe to proceed;
// performs no mutation itself. `breaker` defaults to the real
// Upstash-backed instance — every production caller omits it; the second
// argument exists only so scripts/verify-polar.js can inject an in-memory
// fake to deterministically test the threshold/cooldown behavior without a
// live Redis.
async function guardedSelfHeal(label, breaker = selfHealCircuitBreaker) {
  const environmentHealthy = await verifyPolarEnvironmentHealthy();
  if (!environmentHealthy) {
    console.error(
      `Polar self-heal suppressed (${label}): environment sanity check failed -- ` +
      'POLAR_SERVER/POLAR_ACCESS_TOKEN may be misconfigured, or Polar is unreachable. ' +
      'This does NOT confirm the resource is genuinely gone; refusing to mutate.'
    );
    return false;
  }

  const { permitted } = await breaker.evaluate();
  if (!permitted) {
    console.error(`Polar self-heal suppressed (${label}): circuit breaker denied this event.`);
  }
  return permitted;
}

module.exports = {
  getProductId,
  planFromProduct,
  billingCycleFromPlan,
  hasAccessGrantingStatus,
  polarFetch,
  verifyPolarWebhook,
  describeConfiguredWebhookSecret,
  WebhookVerificationError,
  extractUserId,
  normalizeSubscription,
  collapseToFreeAfterMissingSubscription,
  verifyPolarEnvironmentHealthy,
  isMissingResourceError,
  guardedSelfHeal,
  createSelfHealCircuitBreaker,
  shouldTripCircuit,
  SELF_HEAL_TRIP_THRESHOLD,
  __setSelfHealCircuitBreakerForTesting,
};
