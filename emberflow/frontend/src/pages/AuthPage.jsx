import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setError(result.error.message);
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
      <form className="auth-card" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">{isSignup ? 'Create account' : 'Welcome back'}</p>
          <h1>{isSignup ? 'Start your workspace' : 'Sign in to EmberFlow'}</h1>
        </div>
        {isSignup ? (
          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              autoComplete="name"
            />
          </label>
        ) : null}
        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            autoComplete="email"
          />
        </label>
        <label>
          Password
          <input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}
        <button className="button primary full" type="submit" disabled={submitting}>
          {submitting ? 'Working...' : isSignup ? 'Create account' : 'Login'}
        </button>
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
    </div>
  );
}
