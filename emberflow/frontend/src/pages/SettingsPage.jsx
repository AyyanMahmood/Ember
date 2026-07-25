import { ArrowRight, ExternalLink, Sparkles, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { EmberSelect } from '../components/ui/EmberSelect.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { getProfile, upsertProfile } from '../services/api.js';
import { openBillingPortal, startCheckout } from '../services/subscriptions.js';
import { supabase } from '../services/supabase.js';
import { CURRENCY_OPTIONS } from '../data/currencies.js';
import { COUNTRY_OPTIONS } from '../data/countries.js';
import { formatLimit, PLANS } from '../utils/plans.js';

function UsageMeter({ label, used, limit }) {
  const unlimited = !Number.isFinite(limit);
  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
  const near = !unlimited && pct >= 80;

  return (
    <div className="usage-meter">
      <div className="usage-meter__header">
        <span className="muted small">{label}</span>
        <strong>{used} / {formatLimit(limit)}</strong>
      </div>
      {!unlimited && (
        <div className="usage-meter__track">
          <div
            className={`usage-meter__fill ${near ? 'usage-meter__fill--warning' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const subscription = useSubscription();
  const [form, setForm] = useState({
    full_name: '',
    business_name: '',
    email: '',
    avatar_url: '',
    phone: '',
    address: '',
    country: '',
    currency: 'USD',
    payment_instructions: '',
    invoice_prefix: 'INV',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
          phone: profile.phone || '',
          address: profile.address || '',
          country: profile.country || '',
          currency: profile.currency || 'USD',
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

  if (loading) {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        <LoadingSpinner size="lg" label="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2 className="heading-xl">Profile, business, invoices, and billing.</h2>
        </div>
      </div>

      {error ? <Card variant="default"><div className="error-panel" role="alert">{error}</div></Card> : null}

      <form className="page-stack" onSubmit={handleSubmit}>
        {message ? <p className="form-success">{message}</p> : null}

        <Card variant="default">
          <CardHeader title="Profile" subtitle="Your name and how clients see you." />
          <div className="form-grid">
            <div className="span-2 avatar-settings-row">
              <Avatar src={form.avatar_url} name={form.full_name} size="lg" />
              <label className="file-upload">
                <Upload size={16} />
                {uploadingAvatar ? 'Uploading...' : 'Upload avatar'}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} />
              </label>
            </div>
            <Input label="Name" required value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} />
            <Input label="Email" required type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
            <Input label="Phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            <EmberSelect label="Country" searchable placeholder="Select country" value={form.country} onChange={(value) => updateField('country', value)} options={COUNTRY_OPTIONS} />
          </div>
        </Card>

        <Card variant="default">
          <CardHeader title="Business & invoicing" subtitle="Used on generated invoices and proposals." />
          <div className="form-grid">
            <Input label="Business name" value={form.business_name} onChange={(e) => updateField('business_name', e.target.value)} />
            <EmberSelect label="Default currency" searchable value={form.currency} onChange={(value) => updateField('currency', value)} options={CURRENCY_OPTIONS} />
            <Input label="Invoice prefix" value={form.invoice_prefix} onChange={(e) => updateField('invoice_prefix', e.target.value.toUpperCase())} />
            <Textarea label="Address" rows={3} className="span-2" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
            <Textarea label="Payment instructions" rows={4} className="span-2" value={form.payment_instructions} onChange={(e) => updateField('payment_instructions', e.target.value)} />
          </div>
        </Card>

        <div className="form-actions form-actions--sticky">
          <Button variant="primary" disabled={saving} type="submit">
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
        </div>
      </form>

      <Card variant="default">
        <CardHeader
          title={<span className="brand-studio-teaser__title">Brand Studio <Sparkles size={15} /></span>}
          subtitle="Logo, brand color, and font used across every invoice and proposal."
          action={
            <Button as={Link} to="/app/settings/brand" variant="secondary" rightIcon={<ArrowRight size={16} />}>
              Open Brand Studio
            </Button>
          }
        />
        {!subscription.loading && !subscription.isPro && (
          <Badge variant="blue">Pro feature</Badge>
        )}
      </Card>

      <Card variant="default">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Subscription</p>
            <h3>{subscription.plan?.name || PLANS.free.name}</h3>
          </div>
          {subscription.subscription?.paddle_customer_id ? (
            <Button variant="ghost" type="button" onClick={manageBilling} disabled={billingAction === 'portal'} leftIcon={<ExternalLink size={16} />}>
              {billingAction === 'portal' ? 'Opening...' : 'Manage billing'}
            </Button>
          ) : null}
        </div>
        <div className="subscription-grid">
          <UsageMeter label="Invoice usage" used={subscription.usage.invoicesThisMonth} limit={subscription.invoiceLimit} />
          <UsageMeter label="Client usage" used={subscription.usage.clients} limit={subscription.clientLimit} />
          <div>
            <span className="muted small">Status</span>
            <strong>{subscription.subscription?.status || 'active'}</strong>
          </div>
        </div>
        {!subscription.isPro ? (
          <div className="billing-actions">
            <Button variant="primary" type="button" onClick={() => checkout('pro_monthly')} disabled={Boolean(billingAction)}>
              {billingAction === 'pro_monthly' ? 'Opening...' : 'Upgrade monthly'}
            </Button>
            <Button variant="ghost" type="button" onClick={() => checkout('pro_yearly')} disabled={Boolean(billingAction)}>
              {billingAction === 'pro_yearly' ? 'Opening...' : 'Upgrade yearly'}
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
