const { getAuthenticatedUser } = require('../_utils/supabaseAdmin');
const { methodNotAllowed, optionsHandler, sendJson } = require('../_utils/http');
const { hasAccessGrantingStatus, polarFetch } = require('../_utils/polar');
const { rateLimit } = require('../_utils/rateLimit');
const { matchesDeleteConfirmation, needsSubscriptionRevocation, userStoragePath } = require('../_utils/account');

// Buckets that can contain per-user uploaded files, each under a
// `${userId}/...` prefix (see brandAssets.js / SettingsPage.jsx's avatar
// upload). Add any future upload bucket here — storage cleanup below loops
// over this list rather than hardcoding two calls, so a new bucket only
// needs one line added, not new deletion logic.
const USER_STORAGE_BUCKETS = ['avatars', 'logos'];

// Best-effort: lists and removes every object under the user's folder in
// one bucket. Failures are caught by the caller — this never throws, since
// a stray file left behind (recoverable later via an admin sweep keyed on
// the same `${userId}/` prefix, which we still know even after the account
// is gone) is a far smaller problem than getting a user permanently stuck
// unable to finish deleting their account because of a transient storage
// hiccup on a non-critical cleanup step.
async function clearUserStorage(supabase, userId) {
  const errors = [];
  for (const bucket of USER_STORAGE_BUCKETS) {
    try {
      const { data: files, error: listError } = await supabase.storage.from(bucket).list(userId);
      if (listError) {
        errors.push(`${bucket}: ${listError.message}`);
        continue;
      }
      if (!files || files.length === 0) continue;

      const paths = files.map((file) => userStoragePath(userId, file.name));
      const { error: removeError } = await supabase.storage.from(bucket).remove(paths);
      if (removeError) errors.push(`${bucket}: ${removeError.message}`);
    } catch (err) {
      errors.push(`${bucket}: ${err.message}`);
    }
  }
  return errors;
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return optionsHandler(res);
  if (req.method !== 'POST') return methodNotAllowed(res);

  // Tight and IP-scoped: this is the single most consequential endpoint in
  // the app. 5/hour is generous for a real accidental double-submit and a
  // legitimate retry after a transient failure, while making any kind of
  // automated abuse or brute-force confirmation-guessing impractical.
  const allowed = await rateLimit(req, res, { prefix: 'account-delete', limit: 5, windowSeconds: 3600 });
  if (!allowed) return;

  try {
    const { supabase, user } = await getAuthenticatedUser(req);

    // Re-verify the confirmation server-side — never trust the frontend's
    // own gating alone for a destructive, irreversible action.
    if (!matchesDeleteConfirmation(req.body?.confirmation, user.email)) {
      return sendJson(res, 400, { error: 'Type DELETE or your account email to confirm.' });
    }

    // --- Step 1: billing, before anything destructive happens -----------
    // If the account has a live Polar subscription, revoke it *immediately*
    // (not cancel-at-period-end) — there is about to be no account left to
    // serve, so there is no basis to keep collecting payment against it.
    // This runs before any data is touched: if Polar can't confirm the
    // subscription is stopped, we abort here with nothing deleted yet,
    // rather than risk destroying a paying customer's data while their card
    // keeps being charged with no account left to fix it from. A 404 means
    // the subscription is already gone/stale in the current Polar
    // environment (the same class of staleness switch.js/cancel.js already
    // recover from elsewhere) — safe to treat as "already canceled" and
    // continue, not an error.
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('plan, status, polar_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (subscriptionError) throw subscriptionError;

    if (needsSubscriptionRevocation(subscription, hasAccessGrantingStatus)) {
      try {
        await polarFetch(`/v1/subscriptions/${subscription.polar_subscription_id}`, { method: 'DELETE' });
      } catch (err) {
        if (err.status !== 404) {
          console.error('Account deletion: failed to revoke Polar subscription —', err.message);
          return sendJson(res, 502, {
            error: "We couldn't confirm your subscription was canceled with our billing provider, so nothing has been deleted. Please try again in a moment, or contact support.",
          });
        }
        // 404: already gone in the current Polar environment — proceed.
      }
    }

    // --- Step 2: all database rows, atomically ---------------------------
    // See migration 012_delete_account.sql for the exact table list, delete
    // order, and why this must be a SECURITY DEFINER RPC rather than a
    // series of RLS-scoped client calls (several tables gate DELETE behind
    // an active-Pro RLS check that a Free or lapsed user would silently
    // fail, leaving orphaned rows behind).
    const { error: deleteError } = await supabase.rpc('delete_user_account', { p_user_id: user.id });
    if (deleteError) {
      console.error('Account deletion: delete_user_account RPC failed —', deleteError.message);
      return sendJson(res, 500, {
        error: "We couldn't delete your data. Nothing was changed — please try again, or contact support if this keeps happening.",
      });
    }

    // --- Step 3: storage cleanup (best-effort, see clearUserStorage) -----
    const storageErrors = await clearUserStorage(supabase, user.id);
    if (storageErrors.length > 0) {
      console.error('Account deletion: storage cleanup had failures —', storageErrors.join('; '));
    }

    // --- Step 4: the auth user itself, last ------------------------------
    // Last on purpose: everything above is safely retryable while the auth
    // user still exists (re-running finds empty tables/empty folders and
    // just no-ops its way to this step again). Once this succeeds there is
    // no account left to retry with, so it only happens after every other
    // step has succeeded (or, for storage, been attempted best-effort).
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (authDeleteError) {
      console.error('Account deletion: auth.admin.deleteUser failed —', authDeleteError.message);
      return sendJson(res, 500, {
        error: 'Your data has been deleted, but we could not remove your login. Please contact support to finish closing your account.',
      });
    }

    return sendJson(res, 200, { success: true });
  } catch (err) {
    console.error('Account Deletion Error:', err.message);
    // Deliberately not sendError(): every failure this route can reach is a
    // bounded, safe-to-show message already (same reasoning as
    // checkout.js/portal.js) — sendError()'s production sanitization would
    // hide exactly the context (billing vs. data vs. auth step) a user
    // needs to know whether it's safe to retry.
    return sendJson(res, 400, { error: `Couldn't delete your account: ${err.message}` });
  }
};
