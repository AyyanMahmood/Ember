import { useState } from 'react';
import { PLANS } from '../utils/plans.js';
import { startCheckout } from '../services/subscriptions.js';
import Modal from './Modal.jsx';
import PricingCard from './PricingCard.jsx';

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
    <Modal open={open} title="Upgrade EmberFlow" onClose={onClose}>
      <p className="muted">{reason}</p>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="upgrade-grid">
        <PricingCard
          plan={PLANS.pro_monthly}
          highlight
          actionLabel={loadingPlan === 'pro_monthly' ? 'Opening...' : 'Upgrade monthly'}
          onAction={() => checkout('pro_monthly')}
        />
        <PricingCard
          plan={PLANS.pro_yearly}
          actionLabel={loadingPlan === 'pro_yearly' ? 'Opening...' : 'Upgrade yearly'}
          onAction={() => checkout('pro_yearly')}
        />
      </div>
    </Modal>
  );
}
