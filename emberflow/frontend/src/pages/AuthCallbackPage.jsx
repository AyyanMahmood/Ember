import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BrandLoader } from '../components/ui/Loading.jsx';
import { Seo } from '../components/Seo.jsx';
import { supabase } from '../services/supabase.js';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('working'); // 'working' | 'success' | 'failed'
  const ranOnce = useRef(false);

  useEffect(() => {
    if (ranOnce.current) return;
    ranOnce.current = true;

    async function completeSignIn() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const oauthError = params.get('error_description') || params.get('error');

      if (oauthError) {
        setStatus('failed');
        return;
      }

      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      setStatus(sessionData?.session ? 'success' : 'failed');
    }

    completeSignIn();
  }, []);

  if (status === 'working') {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        <Seo title="Signing you in" noindex path="/auth/callback" />
        <BrandLoader label="Signing you in…" />
      </div>
    );
  }

  if (status === 'success') {
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
