const { getAuthenticatedUser } = require('../_utils/supabaseAdmin');
const { getBaseUrl, methodNotAllowed, optionsHandler, sendJson } = require('../_utils/http');
const { polarFetch } = require('../_utils/polar');
const { rateLimit } = require('../_utils/rateLimit');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return optionsHandler(res);
  if (req.method !== 'POST') return methodNotAllowed(res);

  const allowed = await rateLimit(req, res, {
    prefix: 'portal',
    limit: 5,
    windowSeconds: 60,
  });

  if (!allowed) return;

  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('polar_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    // Prefer the stored Polar customer id, but don't hard-fail if it's stale.
    // This project has already hit one real incident (see POLAR_ENVIRONMENT
    // vs POLAR_SERVER in api/_utils/polar.js) where a deploy pointed at a
    // different Polar environment than the one a customer id was captured
    // under — a customer_id valid in sandbox 404s against production and
    // vice versa. external_customer_id (the Supabase user id, attached at
    // every checkout) resolves independently of which environment stored
    // the row, so try the stored id first and fall back to it rather than
    // failing outright on the first rejection.
    // return_url: "When set, a back button will be shown in the customer
    // portal to return to this URL" (verified against Polar's own
    // CustomerSessionCustomerIDCreate schema docs) — omitted, it stays
    // unset, meaning "no back button appears" at all. Without this, the
    // only way back to EmberFlow after cancelling (or anything else) in the
    // portal was the browser back button, which is exactly the bfcache
    // scenario the useSubscription.js refetch fix has to work around in the
    // first place. A real link click here is a plain, unambiguous fresh
    // navigation — the more reliable of the two return paths, not just a
    // convenience.
    const returnUrl = `${getBaseUrl(req)}/app/subscriptions`;

    const attempts = [];
    if (subscription?.polar_customer_id) {
      attempts.push({ label: 'polar_customer_id', body: { customer_id: subscription.polar_customer_id, return_url: returnUrl } });
    }
    attempts.push({ label: 'external_customer_id (supabase user id)', body: { external_customer_id: user.id, return_url: returnUrl } });

    let session;
    let lastErr;
    for (const attempt of attempts) {
      try {
        session = await polarFetch('/v1/customer-sessions/', {
          method: 'POST',
          body: JSON.stringify(attempt.body),
        });
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        console.error(`Polar portal: customer session lookup via ${attempt.label} failed —`, err.message);
      }
    }

    // Both attempts above can still legitimately fail with 404 for an
    // account whose Polar customer only ever existed under a *different*
    // POLAR_SERVER environment — e.g. it subscribed during Polar sandbox
    // testing, and this deploy now points at production. Sandbox and
    // production are entirely separate customer databases in Polar, so
    // neither the old stored id nor external_customer_id resolves anything
    // there; this is the "stale customer id from the sandbox -> live
    // migration" case. Recover by finding (by exact email — avoids creating
    // a duplicate customer for someone who already has one under this
    // environment but wasn't linked via external_id) or, failing that,
    // creating a fresh customer in *this* environment, then retry once.
    // Gated strictly on 404 ("resource not found"): any other failure
    // (bad token, rate limit, network) is a real problem that recovery
    // would only mask — let it bubble up as before.
    if (lastErr?.status === 404 && subscription) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        const name = profile?.full_name || user.user_metadata?.full_name || user.email;

        const found = await polarFetch(`/v1/customers/?email=${encodeURIComponent(user.email)}&limit=1`);
        let recoveredCustomerId = found?.items?.[0]?.id || null;

        if (!recoveredCustomerId) {
          const created = await polarFetch('/v1/customers/', {
            method: 'POST',
            body: JSON.stringify({ email: user.email, name, external_id: user.id }),
          });
          recoveredCustomerId = created?.id || null;
        }

        if (!recoveredCustomerId) throw new Error('Polar did not return a customer id.');

        session = await polarFetch('/v1/customer-sessions/', {
          method: 'POST',
          body: JSON.stringify({ customer_id: recoveredCustomerId, return_url: returnUrl }),
        });
        lastErr = null;
      } catch (err) {
        lastErr = err;
        console.error('Polar portal: customer recovery (find-or-create) failed —', err.message);
      }
    }

    if (lastErr) throw lastErr;

    // Keep Supabase in sync with whichever id actually just worked, so the
    // next call takes the fast path and other code that trusts
    // polar_customer_id (e.g. checkout.js's duplicate-subscription guard)
    // stays correct. Only ever write an id we've just confirmed resolves —
    // never persist an id speculatively.
    const confirmedCustomerId = session?.customer_id;
    if (subscription && confirmedCustomerId && confirmedCustomerId !== subscription.polar_customer_id) {
      const { error: syncError } = await supabase
        .from('subscriptions')
        .update({ polar_customer_id: confirmedCustomerId })
        .eq('user_id', user.id);
      if (syncError) console.error('Polar portal: failed to sync recovered polar_customer_id —', syncError.message);
    }

    const url = session?.customer_portal_url;
    if (!url) throw new Error('Polar did not return a customer portal URL.');

    return sendJson(res, 200, { url });
  } catch (err) {
    // Deliberately not routed through sendError(): in production that
    // sanitizes every message to "An unexpected error occurred.", which is
    // right for truly unknown failures but wrong here — every error this
    // route can throw (no billing account yet, Polar rejected the request,
    // a misconfigured token/env var) is a known, bounded, safe-to-show
    // billing-context message. Same precedent as checkout.js's 409 branch.
    console.error('Polar Portal Error:', err.message);
    return sendJson(res, 400, { error: `Couldn't open the billing portal: ${err.message}` });
  }
};
