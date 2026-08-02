import { supabase } from './supabase.js';

// Same authenticatedFetch shape as services/subscriptions.js. Kept as its
// own small copy rather than extracted into a shared util: this is the only
// other caller today, and duplicating ~10 lines is a smaller, safer diff
// than reaching into the billing service file to share it.
async function authenticatedFetch(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error('You must be signed in to do this.');

  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (HTTP ${response.status}).`);
  }
  return payload;
}

// Permanently deletes the current user's account: cancels any active Polar
// subscription, deletes every database row they own, removes their
// uploaded files, then deletes the Supabase auth user itself. `confirmation`
// must be exactly "DELETE" or the account's own email — re-verified
// server-side regardless of what the UI already checked.
export async function deleteAccount(confirmation) {
  return authenticatedFetch('/api/account/delete', {
    method: 'POST',
    body: JSON.stringify({ confirmation }),
  });
}
