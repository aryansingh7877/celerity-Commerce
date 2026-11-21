import { supabase, DatabaseProfile } from './client';
import { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

/**
 * Sign up a new user with full name metadata
 */
export async function signUpUser(
  email: string,
  password: string,
  fullName: string
): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

function friendlyAuthError(error: AuthError | null): AuthError | null {
  if (!error) return null;
  const status = (error as AuthError & { status?: number }).status;
  const raw = (error.message || '').toLowerCase();
  let message = error.message;
  if (status === 429 || raw.includes('rate limit') || raw.includes('too many')) {
    message =
      'Too many attempts. Wait a few minutes before trying again (password reset is rate-limited).';
  } else if (
    raw.includes('invalid login credentials') ||
    raw.includes('invalid_credentials')
  ) {
    message =
      'Wrong email or password. Use the password for this Celerity account, or wait and try Forgot password after the rate limit cools down.';
  } else if (raw.includes('email not confirmed')) {
    message = 'Confirm your email from the signup link before signing in.';
  }
  return { ...error, message };
}

/**
 * Sign in existing user with email and password
 */
export async function signInUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  return {
    user: data.user,
    session: data.session,
    error: friendlyAuthError(error),
  };
}

/**
 * Sign out current authenticated session
 */
export async function signOutUser(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Send password reset email
 */
export async function sendPasswordReset(
  email: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/#reset-password` : undefined,
  });
  return { error: friendlyAuthError(error) };
}

/**
 * Fetch profile data for a user
 */
export async function getProfile(userId: string): Promise<DatabaseProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Profile fetch note:', error.message);
      return null;
    }

    return data as DatabaseProfile;
  } catch (err) {
    console.error('Failed to get profile:', err);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  updates: Partial<DatabaseProfile>
): Promise<{ data: DatabaseProfile | null; error: any }> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  return { data, error };
}
