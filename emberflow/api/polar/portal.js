const { getAuthenticatedUser } = require('../_utils/supabaseAdmin');
const { methodNotAllowed, optionsHandler, sendError, sendJson } = require('../_utils/http');
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

    // Prefer the stored Polar customer id; fall back to the external id (the
    // Supabase user id) attached at checkout, which Polar links to the same
    // customer. If neither resolves a customer, Polar returns an error and
    // sendError surfaces a friendly message — there's no billing account yet.
    const body = subscription?.polar_customer_id
      ? { customer_id: subscription.polar_customer_id }
      : { external_customer_id: user.id };

    const session = await polarFetch('/v1/customer-sessions/', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const url = session?.customer_portal_url;
    if (!url) throw new Error('Polar did not return a customer portal URL.');

    return sendJson(res, 200, { url });
  } catch (err) {
    return sendError(res, err);
  }
};
