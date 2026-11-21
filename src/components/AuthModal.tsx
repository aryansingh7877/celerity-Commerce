import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { authModalState, closeAuthModal, openAuthModal, signIn, signUp, resetPassword } = useAuth();
  const { isOpen, view } = authModalState;

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Status feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetFormFeedback = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const switchView = (newView: 'login' | 'register' | 'forgot') => {
    resetFormFeedback();
    openAuthModal(newView);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFeedback();

    if (view === 'register') {
      if (!fullName.trim()) {
        setErrorMsg('Please enter your full name');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match');
        return;
      }

      setLoading(true);
      const res = await signUp(email, password, fullName);
      setLoading(false);

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create account');
      } else {
        setSuccessMsg('Account created successfully! Welcome to Celerity.');
      }
    } else if (view === 'login') {
      if (!email.trim() || !password) {
        setErrorMsg('Please provide both email and password');
        return;
      }

      setLoading(true);
      const res = await signIn(email, password);
      setLoading(false);

      if (!res.success) {
        setErrorMsg(res.error || 'Invalid email or password');
      }
    } else if (view === 'forgot') {
      if (!email.trim()) {
        setErrorMsg('Please enter your email address');
        return;
      }

      setLoading(true);
      const res = await resetPassword(email);
      setLoading(false);

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to send reset link');
      } else {
        setSuccessMsg('Password reset link sent! Check your inbox.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeAuthModal}
        className="fixed inset-0 bg-[#101413]/60 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-md rounded-3xl bg-white p-7 sm:p-8 border border-[#101413]/8 shadow-2xl z-10 overflow-hidden"
      >
        {/* Top Decorative Aurora Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#65B99B] via-[#C8E8D9] to-[#E8C86B]"></div>

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 rounded-full hover:bg-[#F8F8F3] text-[#101413]/50 hover:text-[#101413] transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9E9D9]/70 text-[#0A2540] text-[11px] font-bold uppercase tracking-wider mb-2.5">
            <Sparkles className="w-3 h-3 text-[#65B99B]" />
            Celerity Authentication
          </div>

          <h3 className="font-display text-2xl font-extrabold text-[#0A2540] tracking-tight">
            {view === 'login' && 'Sign in to Celerity'}
            {view === 'register' && 'Create your account'}
            {view === 'forgot' && 'Reset your password'}
          </h3>

          <p className="text-xs text-[#101413]/60 mt-1">
            {view === 'login' && 'Access your active cart, rescue history, and multi-city hub orders.'}
            {view === 'register' && 'Experience guaranteed inventory reservation and smart alternatives.'}
            {view === 'forgot' && 'Enter your registered email to receive a secure recovery link.'}
          </p>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-[#EBF7F2] border border-[#65B99B]/40 text-xs text-[#26352F] flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#65B99B] flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Full Name (Registration only) */}
          {view === 'register' && (
            <div>
              <label className="block text-xs font-bold text-[#0A2540] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#101413]/40">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8F8F3] border border-[#101413]/10 text-xs text-[#101413] placeholder-[#101413]/40 focus:outline-none focus:border-[#65B99B] focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-[#0A2540] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#101413]/40">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="elena@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8F8F3] border border-[#101413]/10 text-xs text-[#101413] placeholder-[#101413]/40 focus:outline-none focus:border-[#65B99B] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Password (Login & Register) */}
          {view !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#0A2540]">
                  Password
                </label>
                {view === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchView('forgot')}
                    className="text-[11px] font-semibold text-[#65B99B] hover:text-[#4E9A7F] cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#101413]/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#F8F8F3] border border-[#101413]/10 text-xs text-[#101413] placeholder-[#101413]/40 focus:outline-none focus:border-[#65B99B] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#101413]/40 hover:text-[#101413] cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password (Register only) */}
          {view === 'register' && (
            <div>
              <label className="block text-xs font-bold text-[#0A2540] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#101413]/40">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F8F8F3] border border-[#101413]/10 text-xs text-[#101413] placeholder-[#101413]/40 focus:outline-none focus:border-[#65B99B] focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          {/* Remember Me Checkbox (Login only) */}
          {view === 'login' && (
            <div className="flex items-center gap-2 pt-1">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[#101413]/20 text-[#65B99B] focus:ring-0 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-[#101413]/70 cursor-pointer select-none">
                Remember authenticated session on this device
              </label>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3 rounded-2xl bg-[#0A2540] hover:bg-[#101413] text-white text-xs font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Processing with Supabase...</span>
              </>
            ) : (
              <>
                <span>
                  {view === 'login' && 'Sign In to Account'}
                  {view === 'register' && 'Complete Registration'}
                  {view === 'forgot' && 'Send Recovery Email'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer Navigation Switcher */}
        <div className="mt-6 pt-4 border-t border-[#101413]/8 text-center text-xs text-[#101413]/60">
          {view === 'login' && (
            <span>
              New to Celerity Commerce?{' '}
              <button
                onClick={() => switchView('register')}
                className="font-bold text-[#65B99B] hover:text-[#4E9A7F] cursor-pointer"
              >
                Create an account
              </button>
            </span>
          )}

          {view === 'register' && (
            <span>
              Already have an account?{' '}
              <button
                onClick={() => switchView('login')}
                className="font-bold text-[#65B99B] hover:text-[#4E9A7F] cursor-pointer"
              >
                Sign in
              </button>
            </span>
          )}

          {view === 'forgot' && (
            <span>
              Remember your password?{' '}
              <button
                onClick={() => switchView('login')}
                className="font-bold text-[#65B99B] hover:text-[#4E9A7F] cursor-pointer"
              >
                Back to sign in
              </button>
            </span>
          )}
        </div>

      </motion.div>
    </div>
  );
};
