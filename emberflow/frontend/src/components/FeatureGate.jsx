import { Lock } from 'lucide-react';
import { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription.js';
import { Badge } from './ui/Badge.jsx';
import { Button } from './ui/Button.jsx';
import { LoadingSpinner } from './ui/Loading.jsx';
import UpgradeModal from './UpgradeModal.jsx';

export default function FeatureGate({ feature, title = 'Pro feature', message, children }) {
  const subscription = useSubscription();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (subscription.loading) return <LoadingSpinner size="md" label="Checking plan..." />;
  if (subscription.canUseFeature(feature)) return children;

  return (
    <section className="panel upgrade-panel">
      <Badge variant="blue" size="sm" className="upgrade-panel__badge">
        <Lock size={12} /> Pro
      </Badge>
      <h3>{title}</h3>
      <p className="muted">{message || 'This workspace needs EmberFlow Pro.'}</p>
      <Button variant="primary" type="button" onClick={() => setUpgradeOpen(true)}>
        Upgrade to Pro
      </Button>
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} reason={message} />
    </section>
  );
}
