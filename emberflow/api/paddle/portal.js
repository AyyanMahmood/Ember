const { getAuthenticatedUser } = require('../_utils/supabaseAdmin');
const { methodNotAllowed, sendJson } = require('../_utils/http');
const { paddleFetch } = require('../_utils/paddle');
const { rateLimit } = require("../_utils/rateLimit");
function pickPortalUrl(session) {
  return (
    session?.urls?.general?.overview ||
    session?.urls?.subscriptions?.[0]?.management ||
    session?.urls?.subscriptions?.[0]?.update_payment_method ||
    session?.url ||
    ''
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
const allowed = await rateLimit(req, res, {
  prefix: "portal",
  limit: 5,
  windowSeconds: 60,
});

if (!allowed) return;
  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (!subscription?.paddle_customer_id) throw new Error('No Paddle customer exists for this workspace.');

    const session = await paddleFetch(`/customers/${subscription.paddle_customer_id}/portal-sessions`, {
      method: 'POST',
      body: JSON.stringify({
        subscription_ids: subscription.paddle_subscription_id ? [subscription.paddle_subscription_id] : [],
      }),
    });

    const url = pickPortalUrl(session);
    if (!url) throw new Error('Paddle did not return a customer portal URL.');

    return sendJson(res, 200, { url });
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }
};
