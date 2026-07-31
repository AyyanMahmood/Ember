import { createContext, createElement, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase.js';
import { authRedirectUrl } from '../utils/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      signUp: (email, password, metadata) =>
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
            emailRedirectTo: authRedirectUrl('/login'),
          },
        }),
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signInWithGoogle: () =>
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: new URL('/auth/callback', window.location.origin).toString() },
        }),
      resetPassword: (email) =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: authRedirectUrl('/reset-password'),
        }),
      // Explicit token_hash verification for the recovery link, rather than
      // relying on Supabase's automatic ?code= exchange -- that exchange
      // only succeeds if the PKCE code verifier is still in the localStorage
      // of whatever browser opens the link, which is only true when it's the
      // same browser/profile that requested the reset. Recovery links are
      // routinely opened somewhere else (a different device, a different
      // browser, a phone's mail app), so that verifier is very often gone by
      // the time the link is actually clicked -- see ResetPasswordPage.jsx.
      verifyPasswordRecovery: (tokenHash, type) => supabase.auth.verifyOtp({ token_hash: tokenHash, type }),
      updatePassword: (password) => supabase.auth.updateUser({ password }),
      resendVerificationEmail: (email) =>
        supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: authRedirectUrl('/login') },
        }),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, user, loading]
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
