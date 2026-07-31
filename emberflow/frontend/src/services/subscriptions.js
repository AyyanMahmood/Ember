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

// Switch the active subscription to a different plan (e.g. Monthly <-> Yearly)
// in place, via Polar's Update Subscription API. One subscription, updated —
// never a second parallel one.
export async function switchPlan(plan) {
  return authenticatedFetch('/api/polar/switch', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

// Cancel the active subscription at period end (keeps Pro until then), or
// resume a subscription that's set to cancel. Fully in-app — no portal.
export async function cancelSubscription() {
  return authenticatedFetch('/api/polar/cancel', {
    method: 'POST',
    body: JSON.stringify({ resume: false }),
  });
}

export async function resumeSubscription() {
  return authenticatedFetch('/api/polar/cancel', {
    method: 'POST',
    body: JSON.stringify({ resume: true }),
  });
}
