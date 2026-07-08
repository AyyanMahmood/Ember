import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { getProfile, upsertProfile } from '../services/api.js';
import { supabase } from '../services/supabase.js';

export default function SettingsPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    business_name: '',
    email: '',
    invoice_brand_color: '#2563eb',
    invoice_footer: 'Thank you for your business.',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const profile = await getProfile();
        setForm({
          full_name: profile.full_name || user.user_metadata?.full_name || '',
          business_name: profile.business_name || '',
          email: profile.email || user.email || '',
          invoice_brand_color: profile.invoice_brand_color || '#2563eb',
          invoice_footer: profile.invoice_footer || 'Thank you for your business.',
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (form.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email: form.email });
        if (authError) throw authError;
      }
      await upsertProfile({
        id: user.id,
        ...form,
      });
      setMessage(form.email !== user.email ? 'Settings saved. Confirm the email change from your inbox.' : 'Settings saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="panel">Loading settings...</div>;

  return (
    <div className="page-stack narrow">
      <div className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Business profile and invoice branding.</h2>
        </div>
      </div>
      <form className="panel form-grid" onSubmit={handleSubmit}>
        {error ? <p className="form-error span-2">{error}</p> : null}
        {message ? <p className="form-success span-2">{message}</p> : null}
        <label>
          Name
          <input required value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} />
        </label>
        <label>
          Business name
          <input value={form.business_name} onChange={(event) => updateField('business_name', event.target.value)} />
        </label>
        <label className="span-2">
          Email
          <input required type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
        </label>
        <label>
          Invoice accent color
          <input
            type="color"
            value={form.invoice_brand_color}
            onChange={(event) => updateField('invoice_brand_color', event.target.value)}
          />
        </label>
        <label className="span-2">
          Invoice footer
          <textarea rows="4" value={form.invoice_footer} onChange={(event) => updateField('invoice_footer', event.target.value)} />
        </label>
        <div className="form-actions span-2">
          <button className="button primary" disabled={saving} type="submit">
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
