import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
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
        // TEMPORARY DEBUG — remove once the OAuth callback is confirmed working end to end.
        console.error('[auth/callback] provider returned an error before code exchange:', oauthError);
        setStatus('failed');
        return;
      }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        // TEMPORARY DEBUG — remove once the OAuth callback is confirmed working end to end.
        // Deliberately not logging `data` itself: it contains the live access/refresh tokens.
        console.log('[auth/callback] exchangeCodeForSession result:', {
          hasSession: Boolean(data?.session),
          error: error ? { name: error.name, status: error.status, message: error.message } : null,
        });
        if (error) {
          console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
        }
      } else {
        console.log('[auth/callback] no ?code= param present on load — either already consumed or not an OAuth redirect');
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      // TEMPORARY DEBUG — remove once the OAuth callback is confirmed working end to end.
      console.log('[auth/callback] getSession result:', {
        hasSession: Boolean(sessionData?.session),
        error: sessionError ? { name: sessionError.name, message: sessionError.message } : null,
      });

      setStatus(sessionData?.session ? 'success' : 'failed');
    }

    completeSignIn();
  }, []);

  if (status === 'working') {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        <Seo title="Signing you in" noindex path="/auth/callback" />
        <LoadingSpinner size="lg" label="Signing you in..." />
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
