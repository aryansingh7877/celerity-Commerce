import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, DatabaseProfile } from '../lib/supabase/client';
import {
  signInUser,
  signUpUser,
  signOutUser,
  sendPasswordReset,
  getProfile,
} from '../lib/supabase/auth';
import { isEmailAuthCallbackUrl } from '../lib/supabase/mfa';
import { api } from '../lib/api';

const FALLBACK_KEY = 'celerity_fallback_user';

/** MFA disabled for now — password login goes straight to Customer/Merchant portal. */
type SessionMode = 'boot' | 'event' | 'interactive';

interface AuthModalState {
  isOpen: boolean;
  view: 'login' | 'register' | 'forgot';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: DatabaseProfile | null;
  profileError: string | null;
  profileLoading: boolean;
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

/** Drop corrupted Supabase tokens (common after password reset → refresh 400s). */
async function clearStaleLocalSession() {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* ignore */
  }
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('sb-') && key.includes('auth')) doomed.push(key);
      if (key.startsWith('celerity_2fa')) doomed.push(key);
    }
    for (const key of doomed) localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem('celerity_2fa_passed');
  } catch {
    /* ignore */
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = window.setTimeout(() => resolve(fallback), ms);
    promise
      .then((v) => {
        window.clearTimeout(t);
        resolve(v);
      })
      .catch(() => {
        window.clearTimeout(t);
        resolve(fallback);
      });
  });
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DatabaseProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [authModalState, setAuthModalState] = useState<AuthModalState>({
    isOpen: false,
    view: 'login',
  });
  /** When true, SIGNED_IN from onAuthStateChange must not run applySession (avoids lock + hang). */
  const interactiveAuthRef = useRef(false);

  const clearAuthState = () => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileError(null);
    setProfileLoading(false);
  };

  const loadProfile = async (currentUser: User): Promise<boolean> => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const prof = await withTimeout(getProfile(currentUser.id), 8_000, null);
      const base: DatabaseProfile = prof ?? {
        id: currentUser.id,
        full_name:
          currentUser.user_metadata?.full_name ||
          currentUser.email?.split('@')[0] ||
          'Customer',
        email: currentUser.email || null,
        role: undefined,
        created_at: currentUser.created_at,
        updated_at: currentUser.created_at,
      };

      try {
        const me = await Promise.race([
          api<{
            user: {
              id: string;
              email: string | null;
              fullName: string | null;
              role: 'customer' | 'admin';
              preferredCity: string | null;
            };
          }>('/api/auth/me'),
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () => reject(new Error('Profile API timed out. Is the API running on :4000?')),
              12_000
            );
          }),
        ]);

        setProfile({
          ...base,
          full_name: me.user.fullName ?? base.full_name,
          email: me.user.email ?? base.email,
          role: me.user.role,
          preferred_city: me.user.preferredCity,
        });
        setProfileError(null);
        return true;
      } catch (err) {
        if (base.role === 'customer' || base.role === 'admin') {
          setProfile({ ...base, role: base.role });
          setProfileError(null);
          return true;
        }
        setProfile(null);
        setProfileError(
          err instanceof Error ? err.message : 'Failed to load profile. Check API and try again.'
        );
        return false;
      }
    } catch (err) {
      setProfile(null);
      setProfileError(err instanceof Error ? err.message : 'Failed to load profile.');
      return false;
    } finally {
      setProfileLoading(false);
    }
  };

  const applySessionInner = async (currentSession: Session | null, _mode: SessionMode) => {
    if (!currentSession?.access_token || !currentSession.user) {
      clearAuthState();
      return;
    }

    if (isEmailAuthCallbackUrl()) {
      try {
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
      } catch {
        /* ignore */
      }
    }

    setSession(currentSession);
    setUser(currentSession.user);
    await loadProfile(currentSession.user);
  };

  const applySession = async (currentSession: Session | null, mode: SessionMode) => {
    try {
      await applySessionInner(currentSession, mode);
    } catch (err) {
      console.error('[auth] applySession failed:', err);
    }
  };

  useEffect(() => {
    clearLegacyFallback();
    let cancelled = false;

    void (async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (cancelled) return;

        // Validate persisted token — stale refresh tokens spam 400s after password resets
        if (currentSession?.access_token) {
          const { error: userErr } = await supabase.auth.getUser();
          if (userErr) {
            await clearStaleLocalSession();
            if (!cancelled) {
              clearAuthState();
              setIsLoading(false);
            }
            return;
          }
        }

        await applySession(currentSession, 'boot');
      } catch {
        await clearStaleLocalSession();
        if (!cancelled) clearAuthState();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'INITIAL_SESSION') return;

      // Leave the auth callback before any further supabase.auth / DB work
      setTimeout(() => {
        if (cancelled) return;

        // Interactive signIn/signUp owns the session apply — skip to avoid deadlock hang
        if (event === 'SIGNED_IN' && interactiveAuthRef.current) {
          return;
        }

        if (event === 'SIGNED_OUT') {
          if (interactiveAuthRef.current) return;
          void applySession(null, 'event');
          return;
        }

        void applySession(currentSession, 'event');
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const normalized = email.trim().toLowerCase();
    interactiveAuthRef.current = true;
    try {
      // Avoid refresh-token 400 noise from a previous broken session
      await clearStaleLocalSession();
      const res = await signInUser(normalized, pass);
      if (res.error || !res.session?.access_token || !res.user) {
        return {
          success: false,
          error:
            res.error?.message ||
            'Sign in failed — no session token. Confirm email if required.',
        };
      }
      setIsLoading(false);
      await applySession(res.session, 'interactive');
      closeAuthModal();
      return { success: true };
    } finally {
      // Keep skip briefly so late SIGNED_IN callbacks are ignored
      window.setTimeout(() => {
        interactiveAuthRef.current = false;
      }, 500);
    }
  };

  const signUp = async (email: string, pass: string, name: string) => {
    const res = await signUpUser(email, pass, name);

    if (res.error) {
      if (res.error.message?.toLowerCase().includes('already registered')) {
        return signIn(email, pass);
      }
      return { success: false, error: res.error.message };
    }

    interactiveAuthRef.current = true;
    try {
      if (res.session?.access_token && res.user) {
        await applySession(res.session, 'interactive');
        closeAuthModal();
        return { success: true };
      }

      const loginRes = await signInUser(email, pass);
      if (!loginRes.error && loginRes.session?.access_token && loginRes.user) {
        await applySession(loginRes.session, 'interactive');
        closeAuthModal();
        return { success: true };
      }

      return {
        success: false,
        error:
          loginRes.error?.message ||
          'Account created but email confirmation is required before you can sign in.',
      };
    } finally {
      window.setTimeout(() => {
        interactiveAuthRef.current = false;
      }, 500);
    }
  };

  const signOut = async () => {
    clearLegacyFallback();
    try {
      await signOutUser();
    } catch {
      /* ignore */
    }
    clearAuthState();
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
        profileError,
        profileLoading,
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
