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
      signInWithGoogle: () => {
        const redirectTo = new URL('/auth/callback', window.location.origin).toString();
        // TEMPORARY DEBUG — remove once the OAuth callback is confirmed working end to end.
        console.log('[OAuth debug] signInWithGoogle', {
          redirectTo,
          'window.location.origin': window.location.origin,
          'authRedirectUrl(/auth/callback) would have been': authRedirectUrl('/auth/callback'),
        });
        return supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
      },
      signInWithMicrosoft: () => {
        const redirectTo = new URL('/auth/callback', window.location.origin).toString();
        // TEMPORARY DEBUG — remove once the OAuth callback is confirmed working end to end.
        console.log('[OAuth debug] signInWithMicrosoft', {
          redirectTo,
          'window.location.origin': window.location.origin,
          'authRedirectUrl(/auth/callback) would have been': authRedirectUrl('/auth/callback'),
        });
        return supabase.auth.signInWithOAuth({
          provider: 'azure',
          options: { redirectTo, scopes: 'email' },
        });
      },
      resetPassword: (email) =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: authRedirectUrl('/reset-password'),
        }),
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
