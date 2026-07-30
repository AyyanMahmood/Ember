const { getAuthenticatedUser } = require('../_utils/supabaseAdmin');
const { getBaseUrl, methodNotAllowed, optionsHandler, sendJson } = require('../_utils/http');
const { getProductId, hasAccessGrantingStatus, polarFetch } = require('../_utils/polar');
const { rateLimit } = require('../_utils/rateLimit');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return optionsHandler(res);
  if (req.method !== 'POST') return methodNotAllowed(res);

  const allowed = await rateLimit(req, res, {
    prefix: 'checkout',
    limit: 5,
    windowSeconds: 60,
  });

  if (!allowed) return;

  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const { plan } = req.body || {};
    // Server-side allow-list: getProductId throws for any plan other than the
    // two known Pro products, so a caller can't inject an arbitrary product.
    const productId = getProductId(plan);

    // A user may only ever have one active Polar subscription. Polar has no
    // API yet to change a subscription's product in place (monthly <-> yearly
    // switching is a request users must complete via the hosted portal), so
    // letting a checkout through while one is already active would create a
    // second, parallel subscription instead of replacing the first - the
    // customer would end up billed on both. Block it here, not just in the
    // UI, since this route can be called directly.
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('status, plan')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingSubscription?.plan !== 'free' && hasAccessGrantingStatus(existingSubscription?.status)) {
      // sendError() replaces the message with a generic string in production
      // (by design, for unexpected errors) - this is an expected, safe,
      // user-actionable message, so send it directly instead.
      return sendJson(res, 409, {
        error:
          'You already have an active subscription. To switch between Monthly and Yearly, cancel your current plan first (Manage billing) - you keep Pro until it ends, then you can subscribe to the new cadence.',
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const baseUrl = getBaseUrl(req);

    // Polar links the checkout (and the resulting subscription) to our user
    // via external_customer_id, so there's no need to pre-create a customer.
    // The same id comes back on every webhook as customer.external_id, and is
    // duplicated into metadata as a belt-and-suspenders fallback.
    const checkout = await polarFetch('/v1/checkouts/', {
      method: 'POST',
      body: JSON.stringify({
        products: [productId],
        success_url: `${baseUrl}/app/subscriptions?billing=success`,
        customer_email: user.email,
        customer_name: profile?.full_name || user.user_metadata?.full_name || user.email,
        external_customer_id: user.id,
        metadata: { user_id: user.id, plan },
      }),
    });

    const checkoutUrl = checkout?.url;
    if (!checkoutUrl) throw new Error('Polar did not return a checkout URL.');

    return sendJson(res, 200, { url: checkoutUrl });
  } catch (err) {
    // Deliberately not routed through sendError(): same reasoning as
    // api/polar/portal.js — in production sendError() sanitizes every
    // message to "An unexpected error occurred.", which hides genuinely
    // useful, safe-to-show billing context (a rejected plan, a Polar-side
    // rejection, a misconfigured product id) behind a dead end. Every error
    // this route can throw is a known, bounded billing-context error.
    console.error('Polar Checkout Error:', err.message);
    return sendJson(res, 400, { error: `Couldn't start checkout: ${err.message}` });
  }
};
