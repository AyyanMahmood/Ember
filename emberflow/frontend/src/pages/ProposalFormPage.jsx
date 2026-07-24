import { LayoutTemplate, Minus, Plus } from 'lucide-react';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, IconButton } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
import { EmberSelect } from '../components/ui/EmberSelect.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import FeatureGate from '../components/FeatureGate.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { createProposal, getProfile } from '../services/api.js';
import { CURRENCY_OPTIONS } from '../data/currencies.js';
import { formatMoney } from '../utils/format.js';
import { ProposalDocument } from '../document-studio/ProposalDocument.jsx';
import { ScaledPreview } from '../document-studio/ScaledPreview.jsx';
import { TemplateSelector } from '../document-studio/TemplateSelector.jsx';
import { ExportMenu } from '../document-studio/ExportMenu.jsx';
import { useDocumentExport } from '../document-studio/useDocumentExport.js';
import { DEFAULT_THEME_ID, getTheme } from '../document-studio/themes.js';
import { MobilePreviewBackdrop, MobilePreviewFab, MobilePreviewHeader, useMobilePreviewSheet } from '../document-studio/MobilePreviewSheet.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';

// Content starters — prefill the form with a starting point. Unrelated to
// the visual document theme (Modern/Executive/...); kept as local-only UI
// state, never persisted, since once a proposal is saved its content
// stands on its own regardless of which starter it began from.
const starters = {
  'Website development': {
    title: 'Website build proposal',
    project_summary: 'A responsive, conversion-focused website designed to present the brand clearly and generate leads.',
    scope: 'Discovery, site architecture, visual design, responsive frontend build, CMS handoff, launch support.',
    timeline: '4 weeks',
    items: [
      { title: 'Discovery and architecture', description: 'Project goals, sitemap, and page planning.', amount: 750 },
      { title: 'Design and build', description: 'Responsive frontend implementation and launch handoff.', amount: 2750 },
    ],
  },
  'Design project': {
    title: 'Brand and interface design proposal',
    project_summary: 'A focused design engagement to create a clear, polished customer-facing experience.',
    scope: 'Creative direction, visual system, interface design, review cycles, and final asset handoff.',
    timeline: '3 weeks',
    items: [
      { title: 'Design system', description: 'Typography, color, components, and core visual rules.', amount: 1200 },
      { title: 'Screen design', description: 'High-fidelity layouts for the agreed scope.', amount: 1800 },
    ],
  },
  Retainer: {
    title: 'Monthly retainer proposal',
    project_summary: 'Ongoing product, design, and implementation support for predictable monthly progress.',
    scope: 'Weekly planning, priority execution, maintenance, performance improvements, and monthly reporting.',
    timeline: 'Monthly engagement',
    items: [{ title: 'Monthly retainer', description: 'Ongoing execution and advisory support.', amount: 3000 }],
  },
  Consulting: {
    title: 'Consulting engagement proposal',
    project_summary: 'Focused advisory work to solve a defined business or technical challenge.',
    scope: 'Audit, stakeholder interviews, recommendations, implementation roadmap, and follow-up review.',
    timeline: '2 weeks',
    items: [{ title: 'Consulting sprint', description: 'Audit, recommendations, roadmap, and review.', amount: 2500 }],
  },
  Custom: {
    title: 'Custom project proposal',
    project_summary: '',
    scope: '',
    timeline: '',
    items: [{ title: 'Project fee', description: '', amount: 1000 }],
  },
};

const DEFAULT_STARTER = 'Website development';

export default function ProposalFormPage() {
  const { user } = useAuth();
  const subscription = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const duplicateFrom = location.state?.duplicateFrom;

  const [starterKey, setStarterKey] = useState(duplicateFrom ? 'Custom' : DEFAULT_STARTER);
  const [themeId, setThemeId] = useState(duplicateFrom?.template || DEFAULT_THEME_ID);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [form, setForm] = useState(() => (
    duplicateFrom
      ? {
          client_name: duplicateFrom.client_name || '',
          title: `Copy of ${duplicateFrom.title}`,
          project_summary: duplicateFrom.project_summary || '',
          scope: duplicateFrom.scope || '',
          timeline: duplicateFrom.timeline || '',
          currency: duplicateFrom.currency || 'USD',
        }
      : {
          client_name: '',
          title: starters[DEFAULT_STARTER].title,
          project_summary: starters[DEFAULT_STARTER].project_summary,
          scope: starters[DEFAULT_STARTER].scope,
          timeline: starters[DEFAULT_STARTER].timeline,
          currency: 'USD',
        }
  ));
  const [items, setItems] = useState(() => (
    duplicateFrom
      ? duplicateFrom.proposal_items.map((item) => ({ title: item.title, description: item.description || '', amount: item.amount }))
      : starters[DEFAULT_STARTER].items
  ));
  const [dirty, setDirty] = useState(Boolean(duplicateFrom));
  const [pendingStarter, setPendingStarter] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [focusItemIndex, setFocusItemIndex] = useState(null);
  const titleRefs = useRef([]);
  const documentRef = useRef(null);
  const { open: previewOpen, openSheet: openPreview, closeSheet: closePreview, fabRef, closeButtonRef: previewCloseRef } = useMobilePreviewSheet();

  useEffect(() => {
    getProfile().then(setProfile).catch((err) => setError(err.message)).finally(() => setProfileLoading(false));
  }, []);

  useEffect(() => {
    if (focusItemIndex !== null && titleRefs.current[focusItemIndex]) {
      titleRefs.current[focusItemIndex].focus();
      setFocusItemIndex(null);
    }
  }, [focusItemIndex, items.length]);

  const amount = useMemo(() => items.reduce((sum, item) => sum + Number(item.amount || 0), 0), [items]);
  const previewProposal = useMemo(() => ({ ...form, template: themeId, amount, proposal_items: items }), [form, themeId, amount, items]);

  const { exportBusy, handleExport } = useDocumentExport({
    kind: 'proposal',
    documentRef,
    filename: previewProposal.title,
    data: previewProposal,
    profile,
    onError: setError,
  });

  function applyStarter(key) {
    setStarterKey(key);
    setForm((current) => ({
      ...current,
      title: starters[key].title,
      project_summary: starters[key].project_summary,
      scope: starters[key].scope,
      timeline: starters[key].timeline,
    }));
    setItems(starters[key].items);
    setDirty(false);
  }

  function handleStarterChange(key) {
    if (dirty) {
      setPendingStarter(key);
    } else {
      applyStarter(key);
    }
  }

  function confirmStarterSwitch() {
    applyStarter(pendingStarter);
    setPendingStarter(null);
  }

  function updateField(field, value) {
    setDirty(true);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateItem(index, field, value) {
    setDirty(true);
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setDirty(true);
    setItems((current) => {
      const next = [...current, { title: '', description: '', amount: 0 }];
      setFocusItemIndex(next.length - 1);
      return next;
    });
  }

  function removeItem(index) {
    setDirty(true);
    setItems((current) => (current.length === 1 ? current : current.filter((_item, itemIndex) => itemIndex !== index)));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const normalizedItems = items
        .map((item) => ({
          title: item.title.trim(),
          description: item.description.trim(),
          amount: Number(item.amount || 0),
        }))
        .filter((item) => item.title && item.amount >= 0);

      await createProposal(
        {
          ...form,
          template: themeId,
          user_id: user.id,
          amount,
        },
        normalizedItems
      );
      navigate('/app/proposals');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const theme = getTheme(themeId);

  return (
    <FeatureGate feature="proposals" title="Proposals are a Pro feature" message="Upgrade to Pro to create and export client proposals.">
      <div className="page-stack">
        <div className="page-header">
          <div>
            <p className="eyebrow">{duplicateFrom ? 'Duplicate proposal' : 'New proposal'}</p>
            <h2 className="heading-xl">{duplicateFrom ? 'Review and adjust the copied proposal.' : 'Start from a template and tailor the scope.'}</h2>
          </div>
        </div>

        <div className="studio-toolbar">
          <Button
            variant="secondary"
            type="button"
            leftIcon={<LayoutTemplate size={16} />}
            onClick={() => setTemplateOpen(true)}
          >
            Template: {theme.name}{theme.isPremium && !subscription.isPro ? ' (Pro)' : ''}
          </Button>
          <div className="studio-toolbar__actions">
            <ExportMenu
              isPro={subscription.isPro}
              busyFormat={exportBusy}
              onExport={handleExport}
              onRequestUpgrade={() => setUpgradeOpen(true)}
            />
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <form onSubmit={handleSubmit}>
          <div className="studio-layout">
            <div className="studio-editor">
              <Card variant="default">
                <div className="form-grid">
                  <Select label="Starter" value={starterKey} onChange={(e) => handleStarterChange(e.target.value)} options={Object.keys(starters).map((name) => ({ value: name, label: name }))} />
                  <Input label="Client name" required autoFocus value={form.client_name} onChange={(e) => updateField('client_name', e.target.value)} />
                  <Input label="Proposal title" required className="span-2" value={form.title} onChange={(e) => updateField('title', e.target.value)} />
                  <Textarea label="Project details" required rows={4} className="span-2" value={form.project_summary} onChange={(e) => updateField('project_summary', e.target.value)} />
                  <Textarea label="Scope" required rows={5} className="span-2" value={form.scope} onChange={(e) => updateField('scope', e.target.value)} />
                  <Input label="Timeline" required value={form.timeline} onChange={(e) => updateField('timeline', e.target.value)} />
                  <EmberSelect label="Currency" searchable value={form.currency} onChange={(value) => updateField('currency', value)} options={CURRENCY_OPTIONS} />
                </div>
              </Card>

              <Card variant="default">
                <div className="items-editor">
                  <div className="panel__header">
                    <h3>Pricing</h3>
                    <Button variant="ghost" size="sm" type="button" onClick={addItem} leftIcon={<Plus size={15} />}>Add item</Button>
                  </div>
                  <div className="proposal-item-row item-row--header" aria-hidden="true">
                    <span>Title</span>
                    <span>Description</span>
                    <span>Amount</span>
                    <span />
                  </div>
                  {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    return (
                      <div className="proposal-item-row" key={index}>
                        <Input
                          ref={(el) => { titleRefs.current[index] = el; }}
                          aria-label="Title"
                          placeholder="Title"
                          required
                          value={item.title}
                          onChange={(e) => updateItem(index, 'title', e.target.value)}
                        />
                        <Input aria-label="Description" placeholder="Description" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                        <Input
                          aria-label="Amount"
                          placeholder="Amount"
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateItem(index, 'amount', e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && isLast) {
                              e.preventDefault();
                              addItem();
                            }
                          }}
                        />
                        <IconButton
                          size="sm"
                          className="icon-button--danger"
                          onClick={() => removeItem(index)}
                          aria-label="Remove proposal item"
                          title="Remove item"
                          disabled={items.length === 1}
                        >
                          <Minus size={16} />
                        </IconButton>
                      </div>
                    );
                  })}
                </div>
                <div className="totals-box totals-box--sticky">
                  <strong>Total {formatMoney(amount, form.currency)}</strong>
                </div>
              </Card>

              <div className="form-actions">
                <Button as={Link} variant="ghost" to="/app/proposals">Cancel</Button>
                <Button variant="primary" disabled={saving} type="submit">
                  {saving ? 'Saving...' : 'Save proposal'}
                </Button>
              </div>
            </div>

            <div className={`studio-preview ${previewOpen ? 'studio-preview--open' : ''}`}>
              <MobilePreviewHeader title="Proposal preview" onClose={closePreview} closeButtonRef={previewCloseRef} />
              <div className="studio-preview__surface">
                {profileLoading ? (
                  <LoadingSpinner size="lg" label="Loading preview..." />
                ) : (
                  <ScaledPreview>
                    <ProposalDocument ref={documentRef} proposal={previewProposal} profile={profile} themeId={themeId} />
                  </ScaledPreview>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {previewOpen && <MobilePreviewBackdrop onClick={closePreview} />}
      {!previewOpen && <MobilePreviewFab onClick={openPreview} fabRef={fabRef} />}

      <TemplateSelector
        isOpen={templateOpen}
        onClose={() => setTemplateOpen(false)}
        kind="proposal"
        data={previewProposal}
        profile={profile}
        value={themeId}
        onChange={setThemeId}
        isPro={subscription.isPro}
        onRequestUpgrade={() => { setTemplateOpen(false); setUpgradeOpen(true); }}
      />

      <ConfirmDialog
        isOpen={Boolean(pendingStarter)}
        onClose={() => setPendingStarter(null)}
        onConfirm={confirmStarterSwitch}
        title="Switch starter?"
        message="Switching starters replaces the title, summary, scope, timeline, and pricing you've entered. This can't be undone."
        confirmLabel="Switch starter"
        variant="danger"
      />

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="Premium templates and advanced export formats are included in EmberFlow Pro."
      />
    </FeatureGate>
  );
}
