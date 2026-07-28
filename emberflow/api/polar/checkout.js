const { getAuthenticatedUser } = require('../_utils/supabaseAdmin');
const { getBaseUrl, methodNotAllowed, optionsHandler, sendError, sendJson } = require('../_utils/http');
const { getProductId, polarFetch } = require('../_utils/polar');
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
        success_url: `${baseUrl}/app/settings?billing=success`,
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
    console.error('Polar Checkout Error:', err.message);
    return sendError(res, err);
  }
};
