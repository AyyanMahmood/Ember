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
