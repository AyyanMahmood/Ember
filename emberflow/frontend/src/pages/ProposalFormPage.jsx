import { Download, Minus, Plus } from 'lucide-react';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, IconButton } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import FeatureGate from '../components/FeatureGate.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { createProposal, getProfile } from '../services/api.js';
import { CURRENCIES } from '../utils/invoice.js';
import { formatMoney } from '../utils/format.js';
import { exportProposalPdf } from '../utils/pdf.js';

const templates = {
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

const DEFAULT_TEMPLATE = 'Website development';

export default function ProposalFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const duplicateFrom = location.state?.duplicateFrom;

  const [template, setTemplate] = useState(duplicateFrom?.template || DEFAULT_TEMPLATE);
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
          title: templates[DEFAULT_TEMPLATE].title,
          project_summary: templates[DEFAULT_TEMPLATE].project_summary,
          scope: templates[DEFAULT_TEMPLATE].scope,
          timeline: templates[DEFAULT_TEMPLATE].timeline,
          currency: 'USD',
        }
  ));
  const [items, setItems] = useState(() => (
    duplicateFrom
      ? duplicateFrom.proposal_items.map((item) => ({ title: item.title, description: item.description || '', amount: item.amount }))
      : templates[DEFAULT_TEMPLATE].items
  ));
  const [dirty, setDirty] = useState(Boolean(duplicateFrom));
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [focusItemIndex, setFocusItemIndex] = useState(null);
  const titleRefs = useRef([]);

  useEffect(() => {
    if (focusItemIndex !== null && titleRefs.current[focusItemIndex]) {
      titleRefs.current[focusItemIndex].focus();
      setFocusItemIndex(null);
    }
  }, [focusItemIndex, items.length]);

  const amount = useMemo(() => items.reduce((sum, item) => sum + Number(item.amount || 0), 0), [items]);
  const proposal = useMemo(() => ({ ...form, template, amount, proposal_items: items }), [form, template, amount, items]);

  function applyTemplate(value) {
    setTemplate(value);
    setForm((current) => ({
      ...current,
      title: templates[value].title,
      project_summary: templates[value].project_summary,
      scope: templates[value].scope,
      timeline: templates[value].timeline,
    }));
    setItems(templates[value].items);
    setDirty(false);
  }

  function handleTemplateChange(value) {
    if (dirty) {
      setPendingTemplate(value);
    } else {
      applyTemplate(value);
    }
  }

  function confirmTemplateSwitch() {
    applyTemplate(pendingTemplate);
    setPendingTemplate(null);
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

  async function exportDraft() {
    try {
      const profile = await getProfile();
      await exportProposalPdf(proposal, profile);
    } catch (err) {
      setError(err.message);
    }
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
          template,
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

  return (
    <FeatureGate feature="proposals" title="Proposals are a Pro feature" message="Upgrade to Pro to create and export client proposals.">
      <div className="page-stack page-stack--narrow">
      <div className="page-header">
        <div>
          <p className="eyebrow">{duplicateFrom ? 'Duplicate proposal' : 'New proposal'}</p>
          <h2 className="heading-xl">{duplicateFrom ? 'Review and adjust the copied proposal.' : 'Start from a template and tailor the scope.'}</h2>
        </div>
      </div>
      <Card variant="default">
        <form className="form-grid" onSubmit={handleSubmit}>
          {error ? <p className="form-error span-2">{error}</p> : null}
          <Select label="Template" value={template} onChange={(e) => handleTemplateChange(e.target.value)} options={Object.keys(templates).map((name) => ({ value: name, label: name }))} />
          <Input label="Client name" required autoFocus value={form.client_name} onChange={(e) => updateField('client_name', e.target.value)} />
          <Input label="Proposal title" required className="span-2" value={form.title} onChange={(e) => updateField('title', e.target.value)} />
          <Textarea label="Project details" required rows={4} className="span-2" value={form.project_summary} onChange={(e) => updateField('project_summary', e.target.value)} />
          <Textarea label="Scope" required rows={5} className="span-2" value={form.scope} onChange={(e) => updateField('scope', e.target.value)} />
          <Input label="Timeline" required value={form.timeline} onChange={(e) => updateField('timeline', e.target.value)} />
          <Select label="Currency" value={form.currency} onChange={(e) => updateField('currency', e.target.value)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          <div className="span-2 items-editor">
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
                <div className="proposal-item-row" key={`${index}-${item.title}`}>
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
          <div className="totals-box totals-box--sticky span-2">
            <strong>Total {formatMoney(amount, form.currency)}</strong>
          </div>
          <div className="form-actions span-2">
            <Button as={Link} variant="ghost" to="/app/proposals">Cancel</Button>
            <Button variant="ghost" type="button" onClick={exportDraft} leftIcon={<Download size={16} />}>
              Export PDF
            </Button>
            <Button variant="primary" disabled={saving} type="submit">
              {saving ? 'Saving...' : 'Save proposal'}
            </Button>
          </div>
        </form>
      </Card>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingTemplate)}
        onClose={() => setPendingTemplate(null)}
        onConfirm={confirmTemplateSwitch}
        title="Switch template?"
        message="Switching templates replaces the title, summary, scope, timeline, and pricing you've entered. This can't be undone."
        confirmLabel="Switch template"
        variant="danger"
      />
    </FeatureGate>
  );
}
