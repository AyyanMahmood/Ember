import { supabase } from './supabase.js';

async function authenticatedFetch(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) throw new Error('You must be signed in to manage billing.');

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
    // payload is null when the response body wasn't valid JSON at all (e.g.
    // a platform-level failure that never reached our handler's own error
    // formatting) — surfacing the HTTP status in that case gives something
    // concrete to search Vercel's logs for, instead of a bare generic string.
    throw new Error(payload?.error || `Billing request failed (HTTP ${response.status}).`);
  }
  return payload;
}

export async function startCheckout(plan) {
  return authenticatedFetch('/api/polar/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

export async function openBillingPortal() {
  return authenticatedFetch('/api/polar/portal', {
    method: 'POST',
  });
}
