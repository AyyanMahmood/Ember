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

  // TODO (deferred, tracked in CLAUDE.md -> "Known Deferred Issues"): this
  // only fetches once on mount, with no realtime subscription and no
  // refetch-on-focus/return. A user who cancels in the Polar customer
  // portal (a separate hosted tab, not a redirect flow) and comes back to
  // an already-open EmberFlow tab won't see the change until something
  // forces a refresh. When the cancellation-sync issue is picked up, this
  // is the hook to extend — either a Supabase realtime subscription on the
  // user's `subscriptions` row, or a `refresh()` call on window focus/visibility
  // change, whichever the investigation in api/polar/webhook.js points to.

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
