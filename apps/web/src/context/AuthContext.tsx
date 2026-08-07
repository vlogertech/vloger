import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { joinPresence, leavePresence } from '@/lib/presence';

type AuthError = { type: 'auth_required' | 'unknown'; message: string } | null;

type AuthContextValue = {
  user: any;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  authError: AuthError;
  authChecked: boolean;
  logout: () => Promise<void>;
  loginWithEmailPassword: (params: { email: string; password: string }) => Promise<void>;
  registerWithEmailPassword: (params: { email: string; password: string }) => Promise<void>;
  forgotPassword: (params: { email: string }) => Promise<void>;
  resetPasswordForEmail: (params: { newPassword: string }) => Promise<any>;
  updateUser: (params: { username?: string; displayName?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Récupère la session existante au démarrage
    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setAuthError({ type: 'unknown', message: error.message });
      } else {
        const sessionUser = data.session?.user ?? null;
        setUser(sessionUser);
        setIsAuthenticated(!!sessionUser);
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });

    // 2. Écoute les changements d'état auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const sessionUser = session?.user ?? null;
      setUser(sessionUser);
      setIsAuthenticated(!!sessionUser);
      setAuthError(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      if (sessionUser) joinPresence(sessionUser.id).catch(() => {});
      else leavePresence().catch(() => {});
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const api = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated,
      isLoadingAuth,
      authError,
      authChecked,
      logout: async () => {
        await leavePresence().catch(() => {});
        await supabase.auth.signOut();
        window.location.href = '/login';
      },
      loginWithEmailPassword: async ({ email, password }) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      registerWithEmailPassword: async ({ email, password }) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      },
      forgotPassword: async ({ email }) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        });
        if (error) throw error;
      },
      resetPasswordForEmail: async ({ newPassword }) => {
        const { data, error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return data;
      },
      updateUser: async ({ username, displayName }) => {
        const { error } = await supabase.auth.updateUser({
          data: {
            ...(username ? { username } : {}),
            ...(displayName ? { display_name: displayName } : {}),
          },
        });
        if (error) throw error;
      },
    }),
    [user, isAuthenticated, isLoadingAuth, authError, authChecked],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
