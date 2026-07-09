import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordField from '../components/PasswordField.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { friendlyAuthError } from '../utils/auth.js';

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="auth-page">
      <Link className="brand-mark" to="/">
        EmberFlow
      </Link>
      <form className="auth-card" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Secure account</p>
          <h1>Create a new password</h1>
        </div>
        <PasswordField
          label="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
        />
        {error ? <p className="form-error">{error}</p> : null}
        <button className="button primary full" disabled={submitting} type="submit">
          {submitting ? 'Saving...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
