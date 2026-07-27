import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { Seo } from '../components/Seo.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function AuthCallbackPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        <Seo title="Signing you in" noindex path="/auth/callback" />
        <LoadingSpinner size="lg" label="Signing you in..." />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <Navigate
      to="/login"
      replace
      state={{ authError: 'Sign-in was cancelled or failed. Please try again.' }}
    />
  );
}
