import { Eye, EyeOff, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar } from '../components/ui/Avatar.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Input, Textarea } from '../components/ui/Input.jsx';
import { EmberSelect } from '../components/ui/EmberSelect.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { getProfile, upsertProfile } from '../services/api.js';
import { supabase } from '../services/supabase.js';
import { CURRENCY_OPTIONS } from '../data/currencies.js';
import { COUNTRY_OPTIONS } from '../data/countries.js';
import { friendlyAuthError } from '../utils/auth.js';

export default function SettingsPage() {
  const { user, signIn, updatePassword } = useAuth();
  const hasPasswordAuth = user?.identities?.some((identity) => identity.provider === 'email') ?? true;
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
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

  function updatePasswordField(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (passwordForm.next.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      const { error: verifyError } = await signIn(user.email, passwordForm.current);
      if (verifyError) {
        setPasswordError('Current password is incorrect.');
        return;
      }
      const { error: updateError } = await updatePassword(passwordForm.next);
      if (updateError) throw updateError;
      setPasswordMessage('Password updated.');
      setPasswordForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPasswordError(friendlyAuthError(err));
    } finally {
      setPasswordSaving(false);
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
          <h1 className="heading-xl">Profile, business, and invoices.</h1>
        </div>
      </div>

      {error ? <Card variant="default"><div className="error-panel" role="alert">{error}</div></Card> : null}

      <form className="page-stack" onSubmit={handleSubmit}>
        {message ? <p className="form-success" role="status">{message}</p> : null}

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
        <CardHeader title="Security" subtitle="Change your account password." />
        {hasPasswordAuth ? (
          <form className="form-grid" onSubmit={handlePasswordChange}>
            <Input
              className="span-2"
              label="Current password"
              type={passwordVisible ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={passwordForm.current}
              onChange={(e) => updatePasswordField('current', e.target.value)}
              rightAddon={
                <button
                  type="button"
                  className="input-addon-btn"
                  onClick={() => setPasswordVisible((v) => !v)}
                  aria-label={passwordVisible ? 'Hide passwords' : 'Show passwords'}
                >
                  {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              }
            />
            <Input
              label="New password"
              type={passwordVisible ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={passwordForm.next}
              onChange={(e) => updatePasswordField('next', e.target.value)}
              rightAddon={
                <button
                  type="button"
                  className="input-addon-btn"
                  onClick={() => setPasswordVisible((v) => !v)}
                  aria-label={passwordVisible ? 'Hide passwords' : 'Show passwords'}
                >
                  {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              }
            />
            <Input
              label="Confirm new password"
              type={passwordVisible ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              value={passwordForm.confirm}
              onChange={(e) => updatePasswordField('confirm', e.target.value)}
              rightAddon={
                <button
                  type="button"
                  className="input-addon-btn"
                  onClick={() => setPasswordVisible((v) => !v)}
                  aria-label={passwordVisible ? 'Hide passwords' : 'Show passwords'}
                >
                  {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              }
            />
            <div className="span-2">
              <PasswordStrengthMeter password={passwordForm.next} />
            </div>
            {passwordError ? <p className="form-error span-2" role="alert">{passwordError}</p> : null}
            {passwordMessage ? <p className="form-success span-2" role="status">{passwordMessage}</p> : null}
            <div className="span-2 form-actions">
              <Button variant="secondary" disabled={passwordSaving} type="submit">
                {passwordSaving ? 'Updating...' : 'Update password'}
              </Button>
            </div>
          </form>
        ) : (
          <p className="muted">
            You sign in with Google, so there&apos;s no EmberFlow password to manage here.
          </p>
        )}
      </Card>
    </div>
  );
}
