import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
import { BrandLoader } from '../components/ui/Loading.jsx';
import { PasswordStrengthMeter } from '../components/ui/PasswordStrengthMeter.jsx';
import { Seo } from '../components/Seo.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { startCheckout } from '../services/subscriptions.js';
import { friendlyAuthError, isDisposableEmail } from '../utils/auth.js';
import { clearPendingPlan, getPendingPlan, setPendingPlan } from '../utils/pendingCheckout.js';

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

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, signInWithGoogle, resendVerificationEmail, user, loading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(location.state?.authError || '');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendState, setResendState] = useState('idle');
  const [openingCheckout, setOpeningCheckout] = useState(false);

  // Persist a plan chosen on the pricing page (?plan=pro_yearly) so checkout
  // opens for it automatically once the user is authenticated — they never
  // pick twice.
  useEffect(() => {
    const plan = new URLSearchParams(location.search).get('plan');
    if (plan) setPendingPlan(plan);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Single post-auth routing choke point (email/password success, OAuth
  // return that lands here already-authed, or an already-signed-in visit):
  // if a plan is pending, open its checkout; otherwise go to the app. Guarded
  // so it runs exactly once.
  const routedRef = useRef(false);
  useEffect(() => {
    if (!user || routedRef.current) return;
    routedRef.current = true;
    const pending = getPendingPlan();
    if (pending) {
      setOpeningCheckout(true);
      clearPendingPlan();
      startCheckout(pending)
        .then(({ url }) => window.location.assign(url))
        .catch(() => navigate('/app/subscriptions', { replace: true }));
    } else {
      navigate(location.state?.from || '/app', { replace: true });
    }
  }, [user, navigate, location.state]);

  if (loading) return <div className="screen-loader"><BrandLoader label="Checking session…" /></div>;
  if (user) {
    return (
      <div className="screen-loader">
        <BrandLoader label={openingCheckout ? 'Opening checkout…' : 'Signing you in…'} />
      </div>
    );
  }

  async function handleGoogleSignIn() {
    setError('');
    setOauthSubmitting('google');
    const result = await signInWithGoogle();
    if (result.error) {
      setOauthSubmitting('');
      setError(friendlyAuthError(result.error));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setNeedsVerification(false);
    setResendState('idle');

    if (isSignup && isDisposableEmail(form.email)) {
      setError('Please use a permanent email address to create an account.');
      return;
    }

    setSubmitting(true);

    const result = isSignup
      ? await signUp(form.email, form.password)
      : await signIn(form.email, form.password);

    setSubmitting(false);
    if (result.error) {
      const rawMessage = (result.error.message || '').toLowerCase();
      if (!isSignup && rawMessage.includes('email not confirmed')) {
        setNeedsVerification(true);
      }
      setError(friendlyAuthError(result.error));
      return;
    }

    if (isSignup && !result.data.session) {
      setSuccess('Check your email to confirm your account, then sign in.');
      setNeedsVerification(true);
      return;
    }

    // Success with a session: leave routing to the post-auth effect above, so
    // the submit path and the already-authenticated path share one behavior
    // (open checkout for a pending plan, otherwise go to the app).
  }

  async function handleResend() {
    if (!form.email) return;
    setResendState('sending');
    setError('');
    const { error: resendError } = await resendVerificationEmail(form.email);
    if (resendError) {
      setResendState('idle');
      setError(friendlyAuthError(resendError));
      return;
    }
    setResendState('sent');
    setSuccess('Verification email resent. Check your inbox.');
  }

  return (
    <div className="auth-page">
      <Seo
        title={isSignup ? 'Create your account' : 'Sign in'}
        description={isSignup ? 'Create your free EmberFlow account and start managing clients, invoices, and proposals.' : 'Sign in to your EmberFlow workspace.'}
        path={isSignup ? '/register' : '/login'}
      />
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
              onClick={handleGoogleSignIn}
            >
              Continue with Google
            </Button>
          </div>
          <div className="auth-divider">
            <span>or</span>
          </div>
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
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
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {success ? <p className="form-success" role="status">{success}</p> : null}
          {needsVerification ? (
            <Button
              type="button"
              variant="ghost"
              fullWidth
              loading={resendState === 'sending'}
              disabled={resendState === 'sent'}
              onClick={handleResend}
            >
              {resendState === 'sent' ? 'Email sent' : 'Resend verification email'}
            </Button>
          ) : null}
          <Button variant="primary" fullWidth loading={submitting} disabled={Boolean(oauthSubmitting)} type="submit">
            {isSignup ? 'Create account' : 'Login'}
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
