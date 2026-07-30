import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSubscription, getUsageSummary } from '../services/api.js';
import { getEntitlements } from '../utils/plans.js';
import { useAuth } from './useAuth.js';

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState({ clients: 0, invoicesThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [subscriptionRow, usageSummary] = await Promise.all([getSubscription(), getUsageSummary()]);
      setSubscription(subscriptionRow);
      setUsage(usageSummary);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Root cause of "EmberFlow stays Pro after cancelling in the Polar
  // portal" (Launch Hardening billing audit, 2026-07-30): manageBilling()
  // sends the browser to Polar's portal via `window.location.assign` — a
  // full navigation away from the SPA, not a new tab. Returning via the
  // browser back button is a classic bfcache restore (no unload/no-store
  // headers block it anywhere in this app — checked), which replays the
  // exact pre-navigation React state instead of remounting, so the
  // one-shot fetch above never re-runs. Refetching on `pageshow` (bfcache
  // restore) and `visibilitychange` (plain tab refocus, e.g. portal opened
  // in a second tab) covers both return paths without adding a realtime
  // subscription this app doesn't otherwise need.
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'visible') refresh();
    }
    function handlePageShow(event) {
      if (event.persisted) refresh();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [refresh]);

  const entitlements = useMemo(() => getEntitlements(subscription), [subscription]);

  return {
    subscription,
    usage,
    loading,
    error,
    refresh,
    ...entitlements,
    canCreateClient: entitlements.isPro || usage.clients < entitlements.clientLimit,
    canCreateInvoice: entitlements.isPro || usage.invoicesThisMonth < entitlements.invoiceLimit,
  };
}
