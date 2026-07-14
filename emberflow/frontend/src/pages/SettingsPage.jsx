import { ExternalLink, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import FeatureGate from '../components/FeatureGate.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { getProfile, upsertProfile } from '../services/api.js';
import { openBillingPortal, startCheckout } from '../services/subscriptions.js';
import { supabase } from '../services/supabase.js';
import { CURRENCIES } from '../utils/invoice.js';
import { formatLimit, PLANS } from '../utils/plans.js';

export default function SettingsPage() {
  const { user } = useAuth();
  const subscription = useSubscription();
  const [form, setForm] = useState({
    full_name: '',
    business_name: '',
    email: '',
    avatar_url: '',
    logo_url: '',
    phone: '',
    address: '',
    country: '',
    currency: 'USD',
    invoice_brand_color: '#3B82F6',
    invoice_footer: 'Thank you for your business.',
    payment_instructions: '',
    invoice_prefix: 'INV',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [billingAction, setBillingAction] = useState('');
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
          avatar_url: profile.avatar_url || '',
          logo_url: profile.logo_url || '',
          phone: profile.phone || '',
          address: profile.address || '',
          country: profile.country || '',
          currency: profile.currency || 'USD',
          invoice_brand_color: profile.invoice_brand_color || '#3B82F6',
          invoice_footer: profile.invoice_footer || 'Thank you for your business.',
          payment_instructions: profile.payment_instructions || '',
          invoice_prefix: profile.invoice_prefix || 'INV',
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

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${user.id}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('logos').getPublicUrl(path);
      updateField('logo_url', data.publicUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setError('');
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `${user.id}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      updateField('avatar_url', data.publicUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingAvatar(false);
    }
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

  async function checkout(plan) {
    setBillingAction(plan);
    setError('');
    try {
      const { url } = await startCheckout(plan);
      window.location.assign(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBillingAction('');
    }
  }

  async function manageBilling() {
    setBillingAction('portal');
    setError('');
    try {
      const { url } = await openBillingPortal();
      window.location.assign(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBillingAction('');
    }
  }

  if (loading) return <div className="panel">Loading settings...</div>;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Profile, business, invoices, and billing.</h2>
        </div>
      </div>

      {error ? <div className="panel error-panel">{error}</div> : null}

      <form className="panel form-grid" onSubmit={handleSubmit}>
        {message ? <p className="form-success span-2">{message}</p> : null}
        <div className="span-2 avatar-settings-row">
          {form.avatar_url ? (
            <img className="avatar-preview large" src={form.avatar_url} alt="Profile avatar" />
          ) : (
            <div className="avatar-fallback large">{(form.full_name || form.email || 'U').slice(0, 2).toUpperCase()}</div>
          )}
          <label className="file-upload">
            <Upload size={16} />
            {uploadingAvatar ? 'Uploading...' : 'Upload avatar'}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} />
          </label>
        </div>
        <label>
          Name
          <input required value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} />
        </label>
        <label>
          Business name
          <input value={form.business_name} onChange={(event) => updateField('business_name', event.target.value)} />
        </label>
        <label>
          Email
          <input required type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
        </label>
        <label>
          Country
          <input value={form.country} onChange={(event) => updateField('country', event.target.value)} />
        </label>
        <label>
          Default currency
          <select value={form.currency} onChange={(event) => updateField('currency', event.target.value)}>
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          Address
          <textarea rows="3" value={form.address} onChange={(event) => updateField('address', event.target.value)} />
        </label>
        <label>
          Invoice prefix
          <input value={form.invoice_prefix} onChange={(event) => updateField('invoice_prefix', event.target.value.toUpperCase())} />
        </label>
        <label className="span-2">
          Payment instructions
          <textarea rows="4" value={form.payment_instructions} onChange={(event) => updateField('payment_instructions', event.target.value)} />
        </label>

        <div className="span-2">
          <FeatureGate feature="branding" title="Invoice branding" message="Upgrade to Pro to add logo and custom invoice branding.">
            <div className="branding-box">
              {form.logo_url ? <img src={form.logo_url} alt="Business logo" /> : <div className="logo-placeholder">Logo</div>}
              <label className="file-upload">
                <Upload size={16} />
                {uploading ? 'Uploading...' : 'Upload logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} />
              </label>
              <label>
                Invoice accent color
                <input type="color" value={form.invoice_brand_color} onChange={(event) => updateField('invoice_brand_color', event.target.value)} />
              </label>
              <label className="span-2">
                Invoice footer
                <textarea rows="4" value={form.invoice_footer} onChange={(event) => updateField('invoice_footer', event.target.value)} />
              </label>
            </div>
          </FeatureGate>
        </div>

        <div className="form-actions span-2">
          <button className="button primary" disabled={saving} type="submit">
            {saving ? 'Saving...' : 'Save settings'}
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Subscription</p>
            <h3>{subscription.plan?.name || PLANS.free.name}</h3>
          </div>
          {subscription.subscription?.paddle_customer_id ? (
            <button className="button ghost" type="button" onClick={manageBilling} disabled={billingAction === 'portal'}>
              <ExternalLink size={16} />
              {billingAction === 'portal' ? 'Opening...' : 'Manage billing'}
            </button>
          ) : null}
        </div>
        <div className="subscription-grid">
          <div>
            <span className="muted small">Invoice usage</span>
            <strong>
              {subscription.usage.invoicesThisMonth} / {formatLimit(subscription.invoiceLimit)}
            </strong>
          </div>
          <div>
            <span className="muted small">Client usage</span>
            <strong>
              {subscription.usage.clients} / {formatLimit(subscription.clientLimit)}
            </strong>
          </div>
          <div>
            <span className="muted small">Status</span>
            <strong>{subscription.subscription?.status || 'active'}</strong>
          </div>
        </div>
        {!subscription.isPro ? (
          <div className="billing-actions">
            <button className="button primary" type="button" onClick={() => checkout('pro_monthly')} disabled={Boolean(billingAction)}>
              {billingAction === 'pro_monthly' ? 'Opening...' : 'Upgrade monthly'}
            </button>
            <button className="button ghost" type="button" onClick={() => checkout('pro_yearly')} disabled={Boolean(billingAction)}>
              {billingAction === 'pro_yearly' ? 'Opening...' : 'Upgrade yearly'}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
