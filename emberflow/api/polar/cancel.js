const { getAuthenticatedUser } = require('../_utils/supabaseAdmin');
const { methodNotAllowed, optionsHandler, sendJson } = require('../_utils/http');
const { hasAccessGrantingStatus, polarFetch } = require('../_utils/polar');
const { rateLimit } = require('../_utils/rateLimit');

// In-app cancellation (and resume). Cancels via Polar's API so the whole flow
// happens inside EmberFlow — no redirect to Polar's portal. Uses
// cancel_at_period_end so the customer keeps Pro until the end of the period
// they've already paid for (verified against Polar's server schema:
// PATCH /v1/subscriptions/{id} { cancel_at_period_end: boolean }). Passing
// `resume: true` sets it back to false to un-cancel.
//
// NOTE: this deliberately does not touch the webhook/entitlement-sync path
// (the separately-deferred portal-cancellation-sync work). It just drives the
// Polar API and returns the result; the subscription.updated webhook still
// persists the state, and the UI refetches.
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return optionsHandler(res);
  if (req.method !== 'POST') return methodNotAllowed(res);

  const allowed = await rateLimit(req, res, { prefix: 'cancel', limit: 5, windowSeconds: 60 });
  if (!allowed) return;

  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const resume = Boolean(req.body && req.body.resume);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('polar_subscription_id, plan, status, cancel_at_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!sub || sub.plan === 'free' || !hasAccessGrantingStatus(sub.status)) {
      return sendJson(res, 409, { error: "You don't have an active subscription to change." });
    }
    if (!sub.polar_subscription_id) {
      return sendJson(res, 409, {
        error: "We couldn't find your subscription with our billing provider. Please contact support so we can fix it.",
      });
    }

    const updated = await polarFetch(`/v1/subscriptions/${sub.polar_subscription_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ cancel_at_period_end: !resume }),
    });

    return sendJson(res, 200, {
      cancel_at_period_end:
        typeof updated?.cancel_at_period_end === 'boolean' ? updated.cancel_at_period_end : !resume,
      current_period_end: updated?.current_period_end || null,
      status: updated?.status || sub.status,
    });
  } catch (err) {
    console.error('Polar Cancel Error:', err.message);
    const verb = req.body && req.body.resume ? 'resume' : 'cancel';
    return sendJson(res, 400, { error: `Couldn't ${verb} your subscription: ${err.message}` });
  }
};
