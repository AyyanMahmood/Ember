import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { friendlyAuthError, isDisposableEmail } from '../utils/auth.js';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.86 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.94v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.94A9 9 0 0 0 0 9c0 1.45.35 2.83.94 4.03l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .94 4.97l3.01 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022" />
      <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00" />
      <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF" />
      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900" />
    </svg>
  );
}

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, signInWithGoogle, signInWithMicrosoft, user, loading } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  if (loading) return <div className="screen-loader">Checking session...</div>;
  if (user) return <Navigate to="/app" replace />;

  async function handleOAuth(provider) {
    setError('');
    setOauthSubmitting(provider);
    const result = provider === 'google' ? await signInWithGoogle() : await signInWithMicrosoft();
    if (result.error) {
      setOauthSubmitting('');
      setError(friendlyAuthError(result.error));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (isSignup && isDisposableEmail(form.email)) {
      setError('Please use a permanent email address to create an account.');
      return;
    }

    setSubmitting(true);

    const result = isSignup
      ? await signUp(form.email, form.password, { full_name: form.name })
      : await signIn(form.email, form.password);

    setSubmitting(false);
    if (result.error) {
      setError(friendlyAuthError(result.error));
      return;
    }

    if (isSignup && !result.data.session) {
      setSuccess('Check your email to confirm your account, then sign in.');
      return;
    }

    navigate(location.state?.from || '/app');
  }

  return (
    <div className="auth-page">
      <Link className="brand-mark" to="/">
        EmberFlow
      </Link>
      <Card variant="strong">
        <form className="auth-card__form" onSubmit={handleSubmit}>
          <div className="auth-card__header">
            <p className="eyebrow">{isSignup ? 'Create account' : 'Welcome back'}</p>
            <h1 className="heading-xl">{isSignup ? 'Start your workspace' : 'Sign in to EmberFlow'}</h1>
          </div>
          <div className="auth-oauth">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              leftIcon={<GoogleIcon />}
              loading={oauthSubmitting === 'google'}
              disabled={Boolean(oauthSubmitting) || submitting}
              onClick={() => handleOAuth('google')}
              aria-label="Continue with Google"
              title="Continue with Google"
            />
            <Button
              type="button"
              variant="secondary"
              fullWidth
              leftIcon={<MicrosoftIcon />}
              loading={oauthSubmitting === 'microsoft'}
              disabled={Boolean(oauthSubmitting) || submitting}
              onClick={() => handleOAuth('microsoft')}
              aria-label="Continue with Microsoft"
              title="Continue with Microsoft"
            />
          </div>
          <div className="auth-divider">
            <span>or</span>
          </div>
          {isSignup ? (
            <div className="auth-card__row">
              <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
              <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
            </div>
          ) : (
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
          )}
          <Input
            label="Password"
            type={passwordVisible ? 'text' : 'password'}
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            rightAddon={
              <button type="button" className="input-addon-btn" onClick={() => setPasswordVisible((v) => !v)} aria-label={passwordVisible ? 'Hide password' : 'Show password'}>
                {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />
          {isSignup ? <PasswordStrengthMeter password={form.password} /> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {success ? <p className="form-success">{success}</p> : null}
          <Button variant="primary" fullWidth disabled={submitting || Boolean(oauthSubmitting)} type="submit">
            {submitting ? 'Working...' : isSignup ? 'Create account' : 'Login'}
          </Button>
          {isSignup ? (
            <p className="center muted small">
              By continuing you agree to our <Link to="/terms">Terms of Service</Link> and{' '}
              <Link to="/privacy">Privacy Policy</Link>.
            </p>
          ) : null}
          <p className="center muted">
            {isSignup ? 'Already have an account?' : 'New to EmberFlow?'}{' '}
            <Link to={isSignup ? '/login' : '/register'}>{isSignup ? 'Login' : 'Create one'}</Link>
          </p>
          {!isSignup ? (
            <p className="center muted">
              <Link to="/forgot-password">Forgot password?</Link>
            </p>
          ) : null}
        </form>
      </Card>
    </div>
  );
}
