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

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Billing request failed.');
  return payload;
}

export async function startCheckout(plan) {
  return authenticatedFetch('/api/paddle/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

export async function openBillingPortal() {
  return authenticatedFetch('/api/paddle/portal', {
    method: 'POST',
  });
}
