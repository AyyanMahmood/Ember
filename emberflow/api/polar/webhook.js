const { getSupabaseAdmin } = require('../_utils/supabaseAdmin');
const { methodNotAllowed, optionsHandler, readRawBody, sendError, sendJson } = require('../_utils/http');
const {
  verifyPolarWebhook,
  WebhookVerificationError,
  extractUserId,
  normalizeSubscription,
} = require('../_utils/polar');
const { rateLimit } = require('../_utils/rateLimit');

// Resolve the EmberFlow user a Polar subscription belongs to. The Supabase
// user id rides along as customer.external_id (set as external_customer_id at
// checkout) and, redundantly, in checkout metadata. If neither is present
// (e.g. a subscription edited directly in the Polar dashboard), fall back to
// matching an existing subscriptions row by its Polar ids.
async function resolveUserId(supabase, data) {
  const direct = extractUserId(data);
  if (direct) return direct;

  const subscriptionId = data?.id;
  if (subscriptionId) {
    const { data: row } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('polar_subscription_id', subscriptionId)
      .maybeSingle();
    if (row?.user_id) return row.user_id;
  }

  const customerId = data?.customer_id || data?.customer?.id;
  if (customerId) {
    const { data: row } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('polar_customer_id', customerId)
      .maybeSingle();
    if (row?.user_id) return row.user_id;
  }

  return '';
}

async function upsertSubscription(supabase, userId, data) {
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const normalized = normalizeSubscription(data, existing || {});

  const { error } = await supabase
    .from('subscriptions')
    .upsert({ user_id: userId, ...normalized }, { onConflict: 'user_id' });

  if (error) throw error;
}

async function markEventProcessed(supabase, eventId, eventType) {
  try {
    await supabase.from('webhook_events').insert({ id: eventId, event_type: eventType });
  } catch (err) {
    // A unique-violation here means a concurrent duplicate delivery already
    // recorded it — harmless, since the upsert above is idempotent.
    console.error('Failed to record webhook event:', err.message);
  }
}

const handler = async function handler(req, res) {
  if (req.method === 'OPTIONS') return optionsHandler(res);
  if (req.method !== 'POST') return methodNotAllowed(res);

  const allowed = await rateLimit(req, res, {
    prefix: 'webhook',
    limit: 60,
    windowSeconds: 60,
  });

  if (!allowed) return;

  // The signature is verified over the exact bytes Polar sent, so the raw
  // body must be read before any parsing.
  const rawBody = await readRawBody(req);

  let event;
  try {
    event = verifyPolarWebhook(rawBody, req.headers);
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return sendJson(res, 403, { error: 'Invalid webhook signature.' });
    }
    // Anything else here is a server misconfiguration (e.g. missing secret).
    return sendError(res, err);
  }

  try {
    const supabase = getSupabaseAdmin();

    // Idempotency: Standard Webhooks carries a unique per-delivery id in the
    // webhook-id header. Acknowledge anything we've already processed.
    const eventId = req.headers['webhook-id'] || '';
    if (eventId) {
      const { data: existing } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('id', eventId)
        .maybeSingle();

      if (existing) {
        return sendJson(res, 200, { received: true, duplicate: true });
      }
    }

    const eventType = event?.type || '';
    const data = event?.data || {};

    // subscription.* events each carry the full subscription object and are
    // the single source of truth for entitlement state (created, active,
    // updated, canceled, uncanceled, revoked). order.* / customer.* events
    // are acknowledged but intentionally not acted on here.
    if (eventType.startsWith('subscription.')) {
      const userId = await resolveUserId(supabase, data);
      if (userId) {
        await upsertSubscription(supabase, userId, data);
      } else {
        console.error(
          `Polar webhook ${eventType}: could not resolve a user for subscription ${data?.id}`
        );
      }
    }

    if (eventId) {
      await markEventProcessed(supabase, eventId, eventType);
    }

    return sendJson(res, 200, { received: true });
  } catch (err) {
    return sendError(res, err);
  }
};

// Disable Vercel's automatic body parsing so readRawBody can access the exact
// request bytes for signature verification. NOTE: the handler is assigned to
// module.exports first, then .config is attached to it — attaching .config
// before the assignment would be discarded when module.exports is replaced.
module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
