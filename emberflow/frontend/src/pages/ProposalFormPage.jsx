import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { createProposal, getProfile } from '../services/api.js';
import { CURRENCIES } from '../utils/invoice.js';
import { exportProposalPdf } from '../utils/pdf.js';

const templates = {
  Web: {
    title: 'Website build proposal',
    project_summary: 'A responsive, conversion-focused website designed to present the brand clearly and generate leads.',
    scope: 'Discovery, site architecture, visual design, responsive frontend build, CMS handoff, launch support.',
    timeline: '4 weeks',
  },
  Retainer: {
    title: 'Monthly retainer proposal',
    project_summary: 'Ongoing product, design, and implementation support for predictable monthly progress.',
    scope: 'Weekly planning, priority execution, maintenance, performance improvements, and monthly reporting.',
    timeline: 'Monthly engagement',
  },
  Consulting: {
    title: 'Consulting engagement proposal',
    project_summary: 'Focused advisory work to solve a defined business or technical challenge.',
    scope: 'Audit, stakeholder interviews, recommendations, implementation roadmap, and follow-up review.',
    timeline: '2 weeks',
  },
};

export default function ProposalFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [template, setTemplate] = useState('Web');
  const [form, setForm] = useState({
    client_name: '',
    title: templates.Web.title,
    project_summary: templates.Web.project_summary,
    scope: templates.Web.scope,
    timeline: templates.Web.timeline,
    amount: 2500,
    currency: 'USD',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const proposal = useMemo(() => ({ ...form, template }), [form, template]);

  function applyTemplate(value) {
    setTemplate(value);
    setForm((current) => ({
      ...current,
      title: templates[value].title,
      project_summary: templates[value].project_summary,
      scope: templates[value].scope,
      timeline: templates[value].timeline,
    }));
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
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
      await createProposal({
        ...proposal,
        user_id: user.id,
        amount: Number(proposal.amount || 0),
      });
      navigate('/app/proposals');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
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
          Amount
          <input
            required
            min="0"
            step="0.01"
            type="number"
            value={form.amount}
            onChange={(event) => updateField('amount', event.target.value)}
          />
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
  );
}
