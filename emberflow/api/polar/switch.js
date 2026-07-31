const { getAuthenticatedUser } = require('../_utils/supabaseAdmin');
const { methodNotAllowed, optionsHandler, sendJson } = require('../_utils/http');
const { getProductId, hasAccessGrantingStatus, planFromProduct, polarFetch } = require('../_utils/polar');
const { rateLimit } = require('../_utils/rateLimit');

// In-app plan switch (Monthly <-> Yearly). Uses Polar's native Update
// Subscription API to change the subscribed product IN PLACE — the same
// subscription is updated, so a user can never end up owning two parallel
// subscriptions (which a second checkout would create). This is why cadence
// switches go through here, not through checkout (which stays guarded by its
// own 409 against starting a second subscription while one is active).
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return optionsHandler(res);
  if (req.method !== 'POST') return methodNotAllowed(res);

  const allowed = await rateLimit(req, res, { prefix: 'switch', limit: 5, windowSeconds: 60 });
  if (!allowed) return;

  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const { plan } = req.body || {};
    // Server-side allow-list: throws for any plan without a Polar product.
    const productId = getProductId(plan);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('polar_subscription_id, plan, status')
      .eq('user_id', user.id)
      .maybeSingle();

    // Switching only applies to an already-active paid subscription; without
    // one it's a fresh purchase, which goes through checkout instead.
    if (!sub || sub.plan === 'free' || !hasAccessGrantingStatus(sub.status)) {
      return sendJson(res, 409, {
        error: "You don't have an active subscription to switch yet — choose a plan to get started.",
      });
    }
    if (!sub.polar_subscription_id) {
      return sendJson(res, 409, {
        error: "We couldn't find your subscription with our billing provider. Please contact support so we can fix it.",
      });
    }
    if (sub.plan === plan) {
      return sendJson(res, 400, { error: "You're already on that plan." });
    }

    // proration_behavior 'invoice': apply the change immediately and settle
    // the prorated difference now — the seamless "switch takes effect right
    // away" behavior (verified against Polar's proration guide + server
    // schema: PATCH /v1/subscriptions/{id} { product_id, proration_behavior }).
    const updated = await polarFetch(`/v1/subscriptions/${sub.polar_subscription_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ product_id: productId, proration_behavior: 'invoice' }),
    });

    // The subscription.updated webhook remains the source of truth that
    // persists the new plan to the DB; we return the derived plan so the UI
    // can confirm the switch landed while it polls for the synced row.
    return sendJson(res, 200, {
      plan: planFromProduct(updated?.product_id) || plan,
      status: updated?.status || sub.status,
    });
  } catch (err) {
    // Bounded, safe-to-show billing errors (same precedent as checkout.js /
    // portal.js) — not routed through sendError()'s production sanitizer.
    console.error('Polar Switch Error:', err.message);
    return sendJson(res, 400, { error: `Couldn't switch your plan: ${err.message}` });
  }
};
