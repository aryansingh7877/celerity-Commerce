import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type AuthView = 'login' | 'signup' | 'forgot';

export const AuthPanel: React.FC = () => {
  const { signIn, signUp, resetPassword } = useAuth();

  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Restore remembered email on initial mount
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('celerity_remember_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch {
      // Ignore local storage error in sandboxed environment
    }
  }, []);

  const clearFeedback = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const switchView = (newView: AuthView) => {
    clearFeedback();
    setView(newView);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (rememberMe) {
        localStorage.setItem('celerity_remember_email', email);
      } else {
        localStorage.removeItem('celerity_remember_email');
      }

      const res = await signIn(email, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to sign in. Please verify your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signUp(email, password, fullName.trim());
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create account.');
      } else {
        setSuccessMessage('Account created successfully! Entering Celerity...');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during signup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword(email);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to send reset link.');
      } else {
        setSuccessMessage('Password reset link has been dispatched to your email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error requesting password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-screen text-[#0A2540] flex flex-col justify-between p-4 sm:p-8 lg:p-12 overflow-y-auto selection:bg-[#10A37F] selection:text-white">
      {/* ── 1. Top Panel Header with Quick View Switcher ── */}
      <div className="relative z-10 flex items-center justify-end mb-6 sm:mb-10">
        {/* Quick View Switcher Pill in Zenvo Glass */}
        <div className="flex items-center p-1 rounded-full bg-white/60 border border-white/80 backdrop-blur-md shadow-xs text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => switchView('login')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
              view === 'login'
                ? 'bg-[#0A2540] text-white shadow-xs'
                : 'text-[#0A2540]/70 hover:text-[#0A2540]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchView('signup')}
            className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
              view === 'signup'
                ? 'bg-[#0A2540] text-white shadow-xs'
                : 'text-[#0A2540]/70 hover:text-[#0A2540]'
            }`}
          >
            Register
          </button>
        </div>
      </div>

      {/* ── 2. Centered Zenvo Frosted Glassmorphism Monolith Card ── */}
      <div className="relative z-10 my-auto max-w-md w-full mx-auto p-6 sm:p-9 rounded-[32px] glass-card-white shadow-2xl">
        {/* Error Alert */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-start gap-2.5 text-red-900 text-xs leading-relaxed backdrop-blur-sm"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="flex-1 font-medium">{errorMessage}</span>
          </motion.div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 p-3.5 rounded-2xl bg-[#10A37F]/15 border border-[#10A37F]/30 flex items-start gap-2.5 text-[#07152B] text-xs leading-relaxed backdrop-blur-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-[#10A37F] shrink-0 mt-0.5" />
            <span className="flex-1 font-semibold">{successMessage}</span>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {/* ═══════════════════════════ VIEW: LOGIN ═══════════════════════════ */}
          {view === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <div className="mb-6">
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0A2540] tracking-tight">
                  Welcome back.
                </h2>
                <p className="text-sm font-medium text-[#0A2540]/65 mt-1">
                  Sign in to continue your smarter commerce experience.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-bold uppercase tracking-wider text-[#0A2540]/75 mb-1.5"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0A2540]/45">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/60 focus:bg-white/95 border border-white/85 focus:border-[#10A37F] focus:ring-2 focus:ring-[#10A37F]/25 outline-none text-sm font-medium text-[#0A2540] placeholder-[#0A2540]/35 transition-all shadow-xs backdrop-blur-md"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-bold uppercase tracking-wider text-[#0A2540]/75"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchView('forgot')}
                      className="text-xs font-bold text-[#10A37F] hover:text-[#0A2540] transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0A2540]/45">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white/60 focus:bg-white/95 border border-white/85 focus:border-[#10A37F] focus:ring-2 focus:ring-[#10A37F]/25 outline-none text-sm font-medium text-[#0A2540] placeholder-[#0A2540]/35 transition-all shadow-xs backdrop-blur-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#0A2540]/45 hover:text-[#0A2540] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-[#0A2540]/25 text-[#0A2540] focus:ring-[#10A37F] cursor-pointer accent-[#0A2540]"
                    />
                    <span className="text-xs font-semibold text-[#0A2540]/70">
                      Remember this device
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3.5 px-5 rounded-2xl bg-[#0A2540] hover:bg-[#07152B] active:scale-[0.99] text-white font-display font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#0A2540]/20 hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer group"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#9ED7B7]" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign in to Celerity</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-[#9ED7B7]" />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Switcher */}
              <div className="mt-7 pt-5 border-t border-[#0A2540]/10 text-center text-xs font-medium text-[#0A2540]/65">
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchView('signup')}
                  className="font-bold text-[#0A2540] hover:text-[#10A37F] transition-colors cursor-pointer ml-1 underline decoration-[#10A37F]/40 underline-offset-2"
                >
                  Create account
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════ VIEW: SIGNUP ═══════════════════════════ */}
          {view === 'signup' && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <div className="mb-6">
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0A2540] tracking-tight">
                  Create your account.
                </h2>
                <p className="text-sm font-medium text-[#0A2540]/65 mt-1">
                  Start deploying autonomous smart basket rescue today.
                </p>
              </div>

              <form onSubmit={handleSignup} className="space-y-3.5">
                <div>
                  <label
                    htmlFor="signup-name"
                    className="block text-xs font-bold uppercase tracking-wider text-[#0A2540]/75 mb-1"
                  >
                    Full name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0A2540]/45">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="signup-name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Alex Morgan"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/60 focus:bg-white/95 border border-white/85 focus:border-[#10A37F] focus:ring-2 focus:ring-[#10A37F]/25 outline-none text-sm font-medium text-[#0A2540] placeholder-[#0A2540]/35 transition-all shadow-xs backdrop-blur-md"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-xs font-bold uppercase tracking-wider text-[#0A2540]/75 mb-1"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0A2540]/45">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="signup-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@company.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/60 focus:bg-white/95 border border-white/85 focus:border-[#10A37F] focus:ring-2 focus:ring-[#10A37F]/25 outline-none text-sm font-medium text-[#0A2540] placeholder-[#0A2540]/35 transition-all shadow-xs backdrop-blur-md"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-bold uppercase tracking-wider text-[#0A2540]/75 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0A2540]/45">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white/60 focus:bg-white/95 border border-white/85 focus:border-[#10A37F] focus:ring-2 focus:ring-[#10A37F]/25 outline-none text-sm font-medium text-[#0A2540] placeholder-[#0A2540]/35 transition-all shadow-xs backdrop-blur-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#0A2540]/45 hover:text-[#0A2540] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="block text-xs font-bold uppercase tracking-wider text-[#0A2540]/75 mb-1"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0A2540]/45">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-white/60 focus:bg-white/95 border border-white/85 focus:border-[#10A37F] focus:ring-2 focus:ring-[#10A37F]/25 outline-none text-sm font-medium text-[#0A2540] placeholder-[#0A2540]/35 transition-all shadow-xs backdrop-blur-md"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#0A2540]/45 hover:text-[#0A2540] transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-5 rounded-2xl bg-[#0A2540] hover:bg-[#07152B] active:scale-[0.99] text-white font-display font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#0A2540]/20 hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer group"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#9ED7B7]" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create account</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-[#9ED7B7]" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Bottom Switcher */}
              <div className="mt-7 pt-5 border-t border-[#0A2540]/10 text-center text-xs font-medium text-[#0A2540]/65">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="font-bold text-[#0A2540] hover:text-[#10A37F] transition-colors cursor-pointer ml-1 underline decoration-[#10A37F]/40 underline-offset-2"
                >
                  Sign in
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════ VIEW: FORGOT PASSWORD ═══════════════════════════ */}
          {view === 'forgot' && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0A2540]/70 hover:text-[#0A2540] mb-3 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Sign in
                </button>
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#0A2540] tracking-tight">
                  Reset password.
                </h2>
                <p className="text-sm font-medium text-[#0A2540]/65 mt-1">
                  Enter your registered email and we&apos;ll send instructions to reset your password.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-email"
                    className="block text-xs font-bold uppercase tracking-wider text-[#0A2540]/75 mb-1.5"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#0A2540]/45">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/60 focus:bg-white/95 border border-white/85 focus:border-[#10A37F] focus:ring-2 focus:ring-[#10A37F]/25 outline-none text-sm font-medium text-[#0A2540] placeholder-[#0A2540]/35 transition-all shadow-xs backdrop-blur-md"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 rounded-2xl bg-[#0A2540] hover:bg-[#07152B] active:scale-[0.99] text-white font-display font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#0A2540]/20 hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer group"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#9ED7B7]" />
                      <span>Sending instructions...</span>
                    </>
                  ) : (
                    <>
                      <span>Send reset link</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1 text-[#9ED7B7]" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-7 pt-5 border-t border-[#0A2540]/10 text-center text-xs font-medium text-[#0A2540]/65">
                Remember your password?{' '}
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="font-bold text-[#0A2540] hover:text-[#10A37F] transition-colors cursor-pointer ml-1 underline decoration-[#10A37F]/40 underline-offset-2"
                >
                  Sign in
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 3. Subtle spacing anchor ── */}
      <div className="relative z-10 h-2" />
    </div>
  );
};
