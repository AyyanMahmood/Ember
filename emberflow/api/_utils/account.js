// Pure logic for account deletion, split out from api/account/delete.js so
// it's independently testable without a live Supabase/Polar environment
// (see scripts/verify-account-deletion.js) — same reasoning as why
// hasAccessGrantingStatus/getProductId live in api/_utils/polar.js rather
// than inline in the route handlers that use them.

// "DELETE" is matched exactly (case-sensitive, trimmed only) since it's a
// fixed literal the UI displays verbatim. The email match is
// case-insensitive: email addresses are conventionally case-insensitive,
// and a user retyping their own address from memory shouldn't be tripped
// up by casing they can't be expected to recall exactly.
function matchesDeleteConfirmation(confirmation, email) {
  const value = typeof confirmation === 'string' ? confirmation.trim() : '';
  if (!value) return false;
  if (value === 'DELETE') return true;
  return typeof email === 'string' && email.length > 0 && value.toLowerCase() === email.toLowerCase();
}

// Whether a subscription needs to be actively revoked with Polar before
// deletion can proceed. Deliberately narrow: only a subscription that is
// both on a paid plan AND in an access-granting status AND has a Polar id
// to revoke is worth an API call — anything else (already free, already
// canceled/unpaid, or missing a polar_subscription_id entirely) has
// nothing live to stop.
function needsSubscriptionRevocation(subscription, hasAccessGrantingStatus) {
  return Boolean(
    subscription &&
      subscription.plan !== 'free' &&
      hasAccessGrantingStatus(subscription.status) &&
      subscription.polar_subscription_id
  );
}

// The per-user storage prefix every upload (avatars, logos) is written
// under — see brandAssets.js / SettingsPage.jsx's avatar upload. Centralized
// here so the deletion cleanup path and any future upload code derive the
// same path from one definition instead of two copies drifting apart.
function userStoragePath(userId, filename) {
  return `${userId}/${filename}`;
}

module.exports = {
  matchesDeleteConfirmation,
  needsSubscriptionRevocation,
  userStoragePath,
};
