import { Lock, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import { useProfile } from '../hooks/useProfile.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { DOCUMENT_THEMES, isPremiumTheme } from '../document-studio/themes.js';
import { ThemeThumbnail } from '../document-studio/TemplateSelector.jsx';
import { SAMPLE_INVOICE } from '../document-studio/sampleDocuments.js';

export default function TemplatesPage() {
  const navigate = useNavigate();
  const subscription = useSubscription();
  const { profile, loading, error: profileError, refresh } = useProfile();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  function selectTemplate(theme) {
    if (isPremiumTheme(theme.id) && !subscription.isPro) {
      setUpgradeOpen(true);
      return;
    }
    navigate(`/app/invoices/new?template=${theme.id}`);
  }

  if (loading) {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        <LoadingSpinner size="lg" label="Loading templates..." />
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="page-stack">
        <div className="page-header">
          <div>
            <p className="eyebrow">Templates</p>
            <h1 className="heading-xl">Something went wrong.</h1>
          </div>
        </div>
        <Card variant="default">
          <div className="error-panel" role="alert">{profileError}</div>
          <div className="form-actions">
            <Button variant="secondary" onClick={refresh}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Templates</p>
          <h1 className="heading-xl">Pick a look, then start your invoice.</h1>
        </div>
      </div>

      <div className="templates-page-grid">
        {DOCUMENT_THEMES.map((theme) => {
          const locked = isPremiumTheme(theme.id) && !subscription.isPro;
          return (
            <article key={theme.id} className="template-selector__card templates-page-grid__card">
              <div className="template-selector__preview">
                <ThemeThumbnail kind="invoice" data={SAMPLE_INVOICE} profile={profile} themeId={theme.id} />
                {locked && (
                  <div className="template-selector__lock">
                    <Lock size={16} />
                    <span>Pro</span>
                  </div>
                )}
              </div>
              <div className="template-selector__meta">
                <strong>{theme.name}</strong>
                <span>{theme.description}</span>
              </div>
              <Button
                variant={locked ? 'secondary' : 'primary'}
                size="sm"
                fullWidth
                leftIcon={locked ? <Lock size={14} /> : <Plus size={14} />}
                onClick={() => selectTemplate(theme)}
              >
                {locked ? 'Unlock with Pro' : 'Create invoice'}
              </Button>
            </article>
          );
        })}
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="Upgrade to Pro to unlock every premium invoice template."
      />
    </div>
  );
}
