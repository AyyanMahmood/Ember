import { Download, Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FeatureGate from '../components/FeatureGate.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { createProposal, getProfile } from '../services/api.js';
import { CURRENCIES } from '../utils/invoice.js';
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

export default function ProposalFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [template, setTemplate] = useState('Website development');
  const [form, setForm] = useState({
    client_name: '',
    title: templates['Website development'].title,
    project_summary: templates['Website development'].project_summary,
    scope: templates['Website development'].scope,
    timeline: templates['Website development'].timeline,
    currency: 'USD',
  });
  const [items, setItems] = useState(templates['Website development'].items);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setItems((current) => [...current, { title: '', description: '', amount: 0 }]);
  }

  function removeItem(index) {
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
      <div className="page-stack narrow">
      <div className="page-header">
        <div>
          <p className="eyebrow">New proposal</p>
          <h2>Start from a template and tailor the scope.</h2>
        </div>
      </div>
      <form className="panel form-grid" onSubmit={handleSubmit}>
        {error ? <p className="form-error span-2">{error}</p> : null}
        <label>
          Template
          <select value={template} onChange={(event) => applyTemplate(event.target.value)}>
            {Object.keys(templates).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Client name
          <input required value={form.client_name} onChange={(event) => updateField('client_name', event.target.value)} />
        </label>
        <label className="span-2">
          Proposal title
          <input required value={form.title} onChange={(event) => updateField('title', event.target.value)} />
        </label>
        <label className="span-2">
          Project details
          <textarea
            required
            rows="4"
            value={form.project_summary}
            onChange={(event) => updateField('project_summary', event.target.value)}
          />
        </label>
        <label className="span-2">
          Scope
          <textarea required rows="5" value={form.scope} onChange={(event) => updateField('scope', event.target.value)} />
        </label>
        <label>
          Timeline
          <input required value={form.timeline} onChange={(event) => updateField('timeline', event.target.value)} />
        </label>
        <label>
          Currency
          <select value={form.currency} onChange={(event) => updateField('currency', event.target.value)}>
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <div className="span-2 items-editor">
          <div className="panel-header">
            <h3>Pricing</h3>
            <button type="button" className="button ghost small" onClick={addItem}>
              <Plus size={15} />
              Add item
            </button>
          </div>
          {items.map((item, index) => (
            <div className="proposal-item-row" key={`${index}-${item.title}`}>
              <label>
                Title
                <input required value={item.title} onChange={(event) => updateItem(index, 'title', event.target.value)} />
              </label>
              <label>
                Description
                <input value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} />
              </label>
              <label>
                Amount
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={item.amount}
                  onChange={(event) => updateItem(index, 'amount', event.target.value)}
                />
              </label>
              <button type="button" className="icon-button item-remove" onClick={() => removeItem(index)} aria-label="Remove proposal item">
                <Minus size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="totals-box span-2">
          <strong>Total {new Intl.NumberFormat('en-US', { style: 'currency', currency: form.currency }).format(amount)}</strong>
        </div>
        <div className="form-actions span-2">
          <Link className="button ghost" to="/app/proposals">
            Cancel
          </Link>
          <button type="button" className="button ghost" onClick={exportDraft}>
            <Download size={16} />
            Export PDF
          </button>
          <button className="button primary" disabled={saving} type="submit">
            {saving ? 'Saving...' : 'Save proposal'}
          </button>
        </div>
      </form>
      </div>
    </FeatureGate>
  );
}
