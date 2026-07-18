import { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription.js';
import { LoadingSpinner } from './ui/Loading.jsx';
import UpgradeModal from './UpgradeModal.jsx';

export default function FeatureGate({ feature, title = 'Pro feature', message, children }) {
  const subscription = useSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (subscription.loading) return <LoadingSpinner size="md" label="Checking plan..." />;
  if (subscription.canUseFeature(feature)) return children;

  return (
    <section className="panel upgrade-panel">
      <p className="eyebrow">Upgrade required</p>
      <h3>{title}</h3>
      <p className="muted">{message || 'This workspace needs EmberFlow Pro.'}</p>
      <button className="button primary" type="button" onClick={() => setUpgradeOpen(true)}>
        Upgrade to Pro
      </button>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={message} />
    </section>
  );
}
