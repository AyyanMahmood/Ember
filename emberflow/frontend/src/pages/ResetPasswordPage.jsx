import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { friendlyAuthError } from '../utils/auth.js';

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

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
      <Card variant="strong">
        <form onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Secure account</p>
            <h1>Create a new password</h1>
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
              <button type="button" onClick={() => setPasswordVisible((v) => !v)} aria-label={passwordVisible ? 'Hide password' : 'Show password'}>
                {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            }
          />
          {error ? <p className="form-error">{error}</p> : null}
          <Button variant="primary" fullWidth disabled={submitting} type="submit">
            {submitting ? 'Saving...' : 'Update password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
