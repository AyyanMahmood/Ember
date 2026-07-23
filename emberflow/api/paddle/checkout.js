const { getAuthenticatedUser } = require('../_utils/supabaseAdmin');
const { getBaseUrl, methodNotAllowed, optionsHandler, sendError, sendJson } = require('../_utils/http');
const { getPriceId, paddleFetch } = require('../_utils/paddle');
const { rateLimit } = require("../_utils/rateLimit");
module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return optionsHandler(res);
  if (req.method !== 'POST') return methodNotAllowed(res);
  const allowed = await rateLimit(req, res, {
    prefix: "checkout",
    limit: 5,
    windowSeconds: 60,
  });

  if (!allowed) return;

  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    const { plan } = req.body || {};
    const priceId = getPriceId(plan);

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    let customerId = subscription?.paddle_customer_id;
    if (!customerId) {
      const existing = await paddleFetch(`/customers?email=${encodeURIComponent(user.email)}`);
      if (existing && existing.length > 0) {
        customerId = existing[0].id;
      } else {
        const customer = await paddleFetch('/customers', {
          method: 'POST',
          body: JSON.stringify({
            email: user.email,
            name: profile?.full_name || user.user_metadata?.full_name || user.email,
            custom_data: { user_id: user.id },
          }),
        });
        customerId = customer.id;
      }
      await supabase
        .from('subscriptions')
        .upsert(
          {
            user_id: user.id,
            plan: 'free',
            status: 'active',
            billing_cycle: 'free',
            paddle_customer_id: customerId,
          },
          { onConflict: 'user_id' }
        );
    }

    const baseUrl = getBaseUrl(req);
    const transaction = await paddleFetch('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        customer_id: customerId,
        items: [{ price_id: priceId, quantity: 1 }],
        collection_mode: 'automatic',
        custom_data: { user_id: user.id, plan },
        checkout: {
          settings: {
            display_mode: 'hosted',
            success_url: `${baseUrl}/app/settings?billing=success`,
          },
        },
      }),
    });

    const checkoutUrl = transaction?.checkout?.url;
    if (!checkoutUrl) throw new Error('Paddle did not return a checkout URL.');

        return sendJson(res, 200, { url: checkoutUrl });

      } catch (err) {
        console.error('\n--- Paddle Checkout Error ---');
        console.error('Response:', err.message);
        console.error('Stack:', err.stack);
        console.error('-----------------------------\n');
        return sendError(res, err);
      }
};
