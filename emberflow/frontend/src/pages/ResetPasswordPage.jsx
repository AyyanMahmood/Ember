import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter.jsx';
import { Seo } from '../components/Seo.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { supabase } from '../services/supabase.js';
import { friendlyAuthError } from '../utils/auth.js';

export default function ResetPasswordPage() {
  const { updatePassword, verifyPasswordRecovery } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [linkValid, setLinkValid] = useState(false);
  const verifyAttempted = useRef(false);

  useEffect(() => {
    // Establishing a session from the reset link is not automatic and
    // reliable enough to skip: Supabase's default ?code= exchange only
    // succeeds if the PKCE code verifier is still in the localStorage of
    // whichever browser opens the link -- true only when it's the exact
    // same browser/profile that requested the reset, not the common case of
    // opening the email link on another device or in the mail app's own
    // in-app browser. token_hash + verifyOtp (Supabase's own recommended
    // pattern for recovery specifically) sidesteps that entirely.
    // verifyAttempted guards against StrictMode's dev-only double-invoke --
    // token_hash is single-use, so a real second attempt would always fail.
    if (verifyAttempted.current) return;
    verifyAttempted.current = true;

    let cancelled = false;

    async function establishSession() {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (tokenHash && type) {
        const { error: verifyError } = await verifyPasswordRecovery(tokenHash, type);
        if (cancelled) return;
        if (!verifyError) {
          setLinkValid(true);
          setVerifying(false);
          return;
        }
      }

      // No token_hash (older/default email template still using ?code=), or
      // the explicit verify above failed -- fall back to checking whether
      // Supabase's automatic detectSessionInUrl exchange already succeeded.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setLinkValid(Boolean(data.session));
      setVerifying(false);
    }

    establishSession();
    return () => {
      cancelled = true;
    };
  }, [searchParams, verifyPasswordRecovery]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await updatePassword(password);
    setSubmitting(false);
    if (result.error) {
      setError(friendlyAuthError(result.error));
      return;
    }
    navigate('/app');
  }

  if (verifying) {
    return (
      <div className="auth-page" role="status" aria-live="polite">
        <LoadingSpinner size="lg" label="Verifying your reset link..." />
      </div>
    );
  }

  if (!linkValid) {
    return (
      <div className="auth-page">
        <Seo title="Reset link expired" noindex path="/reset-password" />
        <Link className="brand-mark" to="/">
          EmberFlow
        </Link>
        <Card variant="strong">
          <div className="auth-card__form">
            <div className="auth-card__header">
              <p className="eyebrow">Secure account</p>
              <h1 className="heading-xl">This link has expired</h1>
            </div>
            <p className="muted">
              Password reset links can only be used once and expire after a short time. Request a new one to continue.
            </p>
            <Button variant="primary" fullWidth type="button" onClick={() => navigate('/forgot-password')}>
              Request a new link
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <Seo title="Set a new password" noindex path="/reset-password" />
      <Link className="brand-mark" to="/">
        EmberFlow
      </Link>
      <Card variant="strong">
        <form className="auth-card__form" onSubmit={handleSubmit}>
          <div className="auth-card__header">
            <p className="eyebrow">Secure account</p>
            <h1 className="heading-xl">Create a new password</h1>
          </div>
          <Input
            label="New password"
            type={passwordVisible ? 'text' : 'password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            rightAddon={
              <button type="button" className="input-addon-btn" onClick={() => setPasswordVisible((v) => !v)} aria-label={passwordVisible ? 'Hide password' : 'Show password'}>
                {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />
          <PasswordStrengthMeter password={password} />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <Button variant="primary" fullWidth disabled={submitting} type="submit">
            {submitting ? 'Saving...' : 'Update password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
