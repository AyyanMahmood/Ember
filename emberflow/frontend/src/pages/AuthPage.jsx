import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { friendlyAuthError } from '../utils/auth.js';

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user, loading } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  if (loading) return <div className="screen-loader">Checking session...</div>;
  if (user) return <Navigate to="/app" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
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
        <form onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">{isSignup ? 'Create account' : 'Welcome back'}</p>
            <h1>{isSignup ? 'Start your workspace' : 'Sign in to EmberFlow'}</h1>
          </div>
          {isSignup ? (
            <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
          ) : null}
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
              <button type="button" onClick={() => setPasswordVisible((v) => !v)} aria-label={passwordVisible ? 'Hide password' : 'Show password'}>
                {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />
          {error ? <p className="form-error">{error}</p> : null}
          {success ? <p className="form-success">{success}</p> : null}
          <Button variant="primary" fullWidth disabled={submitting} type="submit">
            {submitting ? 'Working...' : isSignup ? 'Create account' : 'Login'}
          </Button>
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
