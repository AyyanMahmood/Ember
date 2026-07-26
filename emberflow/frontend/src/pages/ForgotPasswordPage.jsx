import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Seo } from '../components/Seo.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { friendlyAuthError } from '../utils/auth.js';

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
      setError(friendlyAuthError(result.error));
      return;
    }
    setMessage('Password reset link sent. Check your email.');
  }

  return (
    <div className="auth-page">
      <Seo title="Reset your password" description="Request a password reset link for your EmberFlow account." path="/forgot-password" />
      <Link className="brand-mark" to="/">
        EmberFlow
      </Link>
      <Card variant="strong">
        <form className="auth-card__form" onSubmit={handleSubmit}>
          <div className="auth-card__header">
            <p className="eyebrow">Account recovery</p>
            <h1 className="heading-xl">Reset your password</h1>
          </div>
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {message ? <p className="form-success" role="status">{message}</p> : null}
          <Button variant="primary" fullWidth disabled={submitting} type="submit">
            {submitting ? 'Sending...' : 'Send reset link'}
          </Button>
          <Link className="center muted" to="/login">
            Back to login
          </Link>
        </form>
      </Card>
    </div>
  );
}
