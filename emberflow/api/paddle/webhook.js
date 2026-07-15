const { getSupabaseAdmin } = require('../_utils/supabaseAdmin');
const { methodNotAllowed, readRawBody, sendJson } = require('../_utils/http');
const { extractUserId, normalizeSubscriptionPayload, verifyPaddleSignature } = require('../_utils/paddle');
const { rateLimit } = require("../_utils/rateLimit");
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

async function resolveUserId(supabase, data) {
  const directUserId = extractUserId(data);
  if (directUserId) return directUserId;

  if (data?.id?.startsWith?.('sub_')) {
    const { data: row } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('paddle_subscription_id', data.id)
      .maybeSingle();
    if (row?.user_id) return row.user_id;
  }

  if (data?.subscription_id) {
    const { data: row } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('paddle_subscription_id', data.subscription_id)
      .maybeSingle();
    if (row?.user_id) return row.user_id;
  }

  if (data?.customer_id) {
    const { data: row } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('paddle_customer_id', data.customer_id)
      .maybeSingle();
    if (row?.user_id) return row.user_id;
  }

  return '';
}

async function upsertSubscription(supabase, userId, data) {
  const { data: existing } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();
  const normalized = normalizeSubscriptionPayload(data, existing || {});

  if (normalized.paddle_subscription_id || normalized.paddle_customer_id) {
    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          ...normalized,
        },
        { onConflict: 'user_id' }
      );
    if (error) throw error;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);
const allowed = await rateLimit(req, res, {
  prefix: "webhook",
  limit: 60,
  windowSeconds: 60,
});

if (!allowed) return;
  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers['paddle-signature'];
    if (!verifyPaddleSignature(rawBody, signature)) {
      return sendJson(res, 401, { error: 'Invalid webhook signature.' });
    }

    const event = JSON.parse(rawBody);
    const supabase = getSupabaseAdmin();
    const data = event.data || {};
    const userId = await resolveUserId(supabase, data);

    if (userId && event.event_type?.startsWith('subscription.')) {
      await upsertSubscription(supabase, userId, data);
    }

    if (userId && event.event_type === 'transaction.completed' && data.subscription_id) {
      await upsertSubscription(supabase, userId, data);
    }

    return sendJson(res, 200, { received: true });
  }   return sendJson(res, 400, { error: err.message });
}catch (err) {
  console.error(err);

  return sendJson(res, 400, {
    error: err.message,
  });
}
};
