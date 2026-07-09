import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    const result = await resetPassword(email);
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setMessage('Password reset link sent. Check your email.');
  }

  return (
    <div className="auth-page">
      <Link className="brand-mark" to="/">
        EmberFlow
      </Link>
      <form className="auth-card" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Account recovery</p>
          <h1>Reset your password</h1>
        </div>
        <label>
          Email
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-success">{message}</p> : null}
        <button className="button primary full" disabled={submitting} type="submit">
          {submitting ? 'Sending...' : 'Send reset link'}
        </button>
        <Link className="center muted" to="/login">
          Back to login
        </Link>
      </form>
    </div>
  );
}
