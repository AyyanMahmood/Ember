import { ExternalLink, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
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

  if (loading) return <Card variant="default">Loading settings...</Card>;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Profile, business, invoices, and billing.</h2>
        </div>
      </div>

      {error ? <Card variant="default"><div className="error-panel" role="alert">{error}</div></Card> : null}

      <Card variant="default">
        <form className="form-grid" onSubmit={handleSubmit}>
          {message ? <p className="form-success span-2">{message}</p> : null}
          <div className="span-2 avatar-settings-row">
            <Avatar
              src={form.avatar_url}
              name={form.full_name}
              size="lg"
            />
            <label className="file-upload">
              <Upload size={16} />
              {uploadingAvatar ? 'Uploading...' : 'Upload avatar'}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} />
            </label>
          </div>
          <Input label="Name" required value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} />
          <Input label="Business name" value={form.business_name} onChange={(e) => updateField('business_name', e.target.value)} />
          <Input label="Email" required type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
          <Input label="Phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
          <Input label="Country" value={form.country} onChange={(e) => updateField('country', e.target.value)} />
          <Select label="Default currency" value={form.currency} onChange={(e) => updateField('currency', e.target.value)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          <Textarea label="Address" rows={3} className="span-2" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
          <Input label="Invoice prefix" value={form.invoice_prefix} onChange={(e) => updateField('invoice_prefix', e.target.value.toUpperCase())} />
          <Textarea label="Payment instructions" rows={4} className="span-2" value={form.payment_instructions} onChange={(e) => updateField('payment_instructions', e.target.value)} />

          <div className="span-2">
            <FeatureGate feature="branding" title="Invoice branding" message="Upgrade to Pro to add logo and custom invoice branding.">
              <div className="branding-box">
                {form.logo_url ? <img src={form.logo_url} alt="Business logo" /> : <div className="logo-placeholder">Logo</div>}
                <label className="file-upload">
                  <Upload size={16} />
                  {uploading ? 'Uploading...' : 'Upload logo'}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} />
                </label>
                <Input label="Invoice accent color" type="color" value={form.invoice_brand_color} onChange={(e) => updateField('invoice_brand_color', e.target.value)} />
                <Textarea label="Invoice footer" rows={4} className="span-2" value={form.invoice_footer} onChange={(e) => updateField('invoice_footer', e.target.value)} />
              </div>
            </FeatureGate>
          </div>

          <div className="form-actions span-2">
            <Button variant="primary" disabled={saving} type="submit">
              {saving ? 'Saving...' : 'Save settings'}
            </Button>
          </div>
        </form>
      </Card>

      <Card variant="default">
        <div className="panel-header">
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
