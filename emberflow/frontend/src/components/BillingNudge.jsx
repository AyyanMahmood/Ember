import { CreditCard } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription.js';
import { openBillingPortal } from '../services/subscriptions.js';
import { Alert } from './ui/Alert.jsx';
import { Button } from './ui/Button.jsx';

// App-wide dunning nudge. While a subscription is `past_due`, Polar is
// auto-retrying the renewal and the user still has full Pro access — but they
// should update their card before the retries run out and access is revoked.
// Rendered in AppLayout so it surfaces on *every* /app route, not only the
// Subscriptions page a user in this state may never think to open.
//
// Reuses the canonical useSubscription() hook rather than a separate lighter
// fetch, on purpose: CLAUDE.md requires every Pro-status surface to funnel
// through this one hook with no independent caching, so the nudge can never
// disagree with the rest of the app about billing state.
//
// Dismissal is in-memory: it clears the nudge for the current session as the
// user navigates (AppLayout doesn't remount between routes), but a full page
// reload re-surfaces it — the payment problem is unresolved until Polar says
// otherwise, so we shouldn't hide it permanently on one dismiss.
export function BillingNudge() {
  const { subscription, loading } = useSubscription();
  const [dismissed, setDismissed] = useState(false);
  const [opening, setOpening] = useState(false);

  const pastDue = subscription?.status === 'past_due';
  if (loading || !pastDue || dismissed) return null;

  async function updatePayment() {
    setOpening(true);
    try {
      const { url } = await openBillingPortal();
      window.location.assign(url);
    } catch {
      // If the portal session can't be created, don't strand the user on a
      // spinning button — drop back so they can retry or open the full
      // Subscriptions page, which has its own error handling.
      setOpening(false);
    }
  }

  return (
    <div className="billing-nudge">
      <Alert
        variant="warning"
        title="Your last payment didn't go through"
        onDismiss={() => setDismissed(true)}
        dismissLabel="Dismiss for now"
        action={
          <>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={updatePayment}
              loading={opening}
              leftIcon={<CreditCard size={16} />}
            >
              Update payment method
            </Button>
            <Button as={Link} to="/app/subscriptions" variant="ghost" size="sm">
              View details
            </Button>
          </>
        }
      >
        You still have full Pro access while we retry the charge — update your card to avoid losing it.
      </Alert>
    </div>
  );
}
