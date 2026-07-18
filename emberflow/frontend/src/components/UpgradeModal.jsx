import { useState } from 'react';
import { PLANS } from '../utils/plans.js';
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
        <PricingCard
          name={PLANS.pro_monthly.name}
          price={PLANS.pro_monthly.price}
          period={PLANS.pro_monthly.cadence}
          features={PLANS.pro_monthly.features}
          highlight
          cta={
            <Button
              variant="primary"
              fullWidth
              onClick={() => checkout('pro_monthly')}
              loading={loadingPlan === 'pro_monthly'}
            >
              Upgrade monthly
            </Button>
          }
        />
        <PricingCard
          name={PLANS.pro_yearly.name}
          price={PLANS.pro_yearly.price}
          period={PLANS.pro_yearly.cadence}
          features={PLANS.pro_yearly.features}
          cta={
            <Button
              variant="primary"
              fullWidth
              onClick={() => checkout('pro_yearly')}
              loading={loadingPlan === 'pro_yearly'}
            >
              Upgrade yearly
            </Button>
          }
        />
      </div>
    </Modal>
  );
}
