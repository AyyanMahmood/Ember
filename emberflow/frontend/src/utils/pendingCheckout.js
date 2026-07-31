import { getPaidPlans } from './plans.js';

// Persist the plan a user picked on the pricing page across the auth flow
// (register/login, including OAuth's cross-origin round trip) so checkout
// opens for that plan automatically once they're signed in — they never
// choose twice. localStorage survives the OAuth redirect; the value is
// consumed once, on the first authenticated landing.
const KEY = 'emberflow_pending_plan';

// Validate against the plan catalog (not a hardcoded set) so a future paid
// plan is automatically a valid pending selection.
function isValidPlan(plan) {
  return getPaidPlans().some((p) => p.id === plan);
}

export function setPendingPlan(plan) {
  try {
    if (isValidPlan(plan)) localStorage.setItem(KEY, plan);
  } catch {
    /* storage unavailable — non-fatal, the user just picks again in-app */
  }
}

export function getPendingPlan() {
  try {
    const value = localStorage.getItem(KEY);
    return isValidPlan(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearPendingPlan() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
