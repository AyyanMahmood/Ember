import { useState } from 'react';
import { getPaidPlans } from '../utils/plans.js';
import { startCheckout } from '../services/subscriptions.js';
import { Button } from './ui/Button.jsx';
import { PricingCard } from './ui/Card.jsx';
import { Modal } from './ui/Modal.jsx';

export default function UpgradeModal({ open, onClose, reason = 'Upgrade to Pro to keep growing in EmberFlow.' }) {
  const [error, setError] = useState('');
  const [loadingPlan, setLoadingPlan] = useState('');

  async function checkout(plan) {
    setError('');
    setLoadingPlan(plan);
    try {
      const { url } = await startCheckout(plan);
      window.location.assign(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPlan('');
    }
  }

  return (
    <Modal isOpen={open} title="Upgrade EmberFlow" onClose={onClose}>
      <p className="muted">{reason}</p>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="upgrade-grid">
        {getPaidPlans().map((plan) => (
          <PricingCard
            key={plan.id}
            name={plan.name}
            price={plan.price}
            period={plan.cadence}
            features={plan.features}
            highlight={plan.highlight}
            cta={
              <Button
                variant="primary"
                fullWidth
                onClick={() => checkout(plan.id)}
                loading={loadingPlan === plan.id}
              >
                Upgrade {plan.shortName.toLowerCase()}
              </Button>
            }
          />
        ))}
      </div>
    </Modal>
  );
}
