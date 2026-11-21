import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, DatabaseProfile } from '../lib/supabase/client';
import {
  signInUser,
  signUpUser,
  signOutUser,
  sendPasswordReset,
  getProfile,
} from '../lib/supabase/auth';
import { api } from '../lib/api';

const FALLBACK_KEY = 'celerity_fallback_user';

interface AuthModalState {
  isOpen: boolean;
  view: 'login' | 'register' | 'forgot';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: DatabaseProfile | null;
  isLoading: boolean;
  authModalState: AuthModalState;
  isDashboardOpen: boolean;
  openAuthModal: (view?: 'login' | 'register' | 'forgot') => void;
  closeAuthModal: () => void;
  openDashboard: () => void;
  closeDashboard: () => void;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, pass: string, name: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function clearLegacyFallback() {
  try {
    localStorage.removeItem(FALLBACK_KEY);
  } catch {
    /* ignore */
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DatabaseProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(false);
  const [authModalState, setAuthModalState] = useState<AuthModalState>({
    isOpen: false,
    view: 'login',
  });

  const loadProfile = async (currentUser: User) => {
    const prof = await getProfile(currentUser.id);
    const base: DatabaseProfile = prof ?? {
      id: currentUser.id,
      full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Customer',
      email: currentUser.email || null,
      role: 'customer',
      created_at: currentUser.created_at,
      updated_at: currentUser.created_at,
    };

    try {
      const me = await api<{
        user: {
          id: string;
          email: string | null;
          fullName: string | null;
          role: 'customer' | 'admin';
          preferredCity: string | null;
        };
      }>('/api/auth/me');
      setProfile({
        ...base,
        full_name: me.user.fullName ?? base.full_name,
        email: me.user.email ?? base.email,
        role: me.user.role,
        preferred_city: me.user.preferredCity,
      });
    } catch {
      setProfile({ ...base, role: base.role ?? 'customer' });
    }
  };

  const applySession = async (currentSession: Session | null) => {
    if (!currentSession?.access_token || !currentSession.user) {
      setSession(null);
      setUser(null);
      setProfile(null);
      return;
    }
    // Set auth state immediately so the UI can leave the login screen
    setSession(currentSession);
    setUser(currentSession.user);
    // Profile fetch is best-effort (must not block / deadlock auth lock)
    try {
      await loadProfile(currentSession.user);
    } catch {
      /* keep base session even if /api/auth/me fails */
    }
  };

  useEffect(() => {
    clearLegacyFallback();

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      void applySession(currentSession).finally(() => setIsLoading(false));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      // Defer: awaiting getSession/API inside this callback deadlocks supabase-js
      setTimeout(() => {
        void applySession(currentSession).finally(() => setIsLoading(false));
      }, 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const openAuthModal = (view: 'login' | 'register' | 'forgot' = 'login') => {
    setAuthModalState({ isOpen: true, view });
  };

  const closeAuthModal = () => {
    setAuthModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const openDashboard = () => {
    if (!session?.access_token) {
      openAuthModal('login');
      return;
    }
    setIsDashboardOpen(true);
  };

  const closeDashboard = () => {
    setIsDashboardOpen(false);
  };

  const signIn = async (email: string, pass: string) => {
    const res = await signInUser(email.trim().toLowerCase(), pass);
    if (res.error || !res.session?.access_token || !res.user) {
      return {
        success: false,
        error: res.error?.message || 'Sign in failed — no session token. Confirm email if required.',
      };
    }
    setIsLoading(false);
    await applySession(res.session);
    closeAuthModal();
    return { success: true };
  };

  const signUp = async (email: string, pass: string, name: string) => {
    const res = await signUpUser(email, pass, name);

    if (res.error) {
      if (res.error.message?.toLowerCase().includes('already registered')) {
        return signIn(email, pass);
      }
      return { success: false, error: res.error.message };
    }

    if (res.session?.access_token && res.user) {
      await applySession(res.session);
      closeAuthModal();
      return { success: true };
    }

    const loginRes = await signInUser(email, pass);
    if (!loginRes.error && loginRes.session?.access_token && loginRes.user) {
      await applySession(loginRes.session);
      closeAuthModal();
      return { success: true };
    }

    return {
      success: false,
      error:
        loginRes.error?.message ||
        'Account created but email confirmation is required before you can sign in.',
    };
  };

  const signOut = async () => {
    clearLegacyFallback();
    await signOutUser();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsDashboardOpen(false);
  };

  const resetPassword = async (email: string) => {
    const res = await sendPasswordReset(email);
    if (res.error) {
      return { success: false, error: res.error.message };
    }
    return { success: true };
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        authModalState,
        isDashboardOpen,
        openAuthModal,
        closeAuthModal,
        openDashboard,
        closeDashboard,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
