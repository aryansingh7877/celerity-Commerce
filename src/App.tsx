import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { CustomerStorefront } from './components/storefront/CustomerStorefront';
import { MerchantDashboard } from './components/merchant/MerchantDashboard';
import { BrandLogo } from './components/common/BrandLogo';
import { Loader2, AlertCircle, LogOut, RefreshCw } from 'lucide-react';
import { getLoginIntent } from './lib/loginIntent';

const LoadingScreen: React.FC<{ label?: string }> = ({
  label = 'Connecting to Celerity Mesh...',
}) => (
  <div className="h-screen w-full bg-[#070A09] flex flex-col items-center justify-center text-white select-none">
    <div className="relative w-14 h-14 rounded-2xl bg-[#DCEFE3]/15 border border-[#65B99B]/30 flex items-center justify-center shadow-lg shadow-[#65B99B]/20 mb-4 animate-pulse p-1.5">
      <BrandLogo className="w-full h-full" />
    </div>
    <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#65B99B] uppercase">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#65B99B]" />
      <span>{label}</span>
    </div>
  </div>
);

const AccessDeniedScreen: React.FC<{
  title: string;
  message: string;
  onRetry?: () => void;
  onSignOut: () => void;
}> = ({ title, message, onRetry, onSignOut }) => (
  <div className="h-screen w-full bg-[#070A09] flex flex-col items-center justify-center text-white px-6 text-center">
    <div className="relative w-14 h-14 rounded-2xl bg-red-500/15 border border-red-400/30 flex items-center justify-center mb-5">
      <AlertCircle className="w-7 h-7 text-red-300" />
    </div>
    <h1 className="font-display text-xl font-black tracking-tight mb-2">{title}</h1>
    <p className="text-sm text-white/70 max-w-sm mb-6">{message}</p>
    <div className="flex flex-wrap items-center justify-center gap-3">
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#65B99B] text-[#070A09] text-xs font-bold cursor-pointer hover:bg-[#7bc9ad]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
      <button
        type="button"
        onClick={onSignOut}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold cursor-pointer hover:bg-white/15"
      >
        <LogOut className="w-3.5 h-3.5" />
        Sign out
      </button>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const {
    user,
    session,
    profile,
    profileError,
    profileLoading,
    isLoading,
    signOut,
    refreshProfile,
  } = useAuth();

  if (isLoading) return <LoadingScreen />;

  if (!session?.access_token || !user) {
    return <AuthPage />;
  }

  if (profileError && !profile) {
    return (
      <AccessDeniedScreen
        title="Profile unavailable"
        message={profileError}
        onRetry={() => {
          void refreshProfile();
        }}
        onSignOut={() => {
          void signOut();
        }}
      />
    );
  }

  if (profileLoading || !profile) {
    return <LoadingScreen label="Loading your profile..." />;
  }

  const role = profile.role;
  const intent = getLoginIntent();

  if (intent === 'merchant' && role !== 'admin') {
    return (
      <AccessDeniedScreen
        title="Merchant access required"
        message="You signed in as Merchant, but this account is not an admin. Choose Customer on the login page, or use an admin account."
        onSignOut={() => {
          void signOut();
        }}
      />
    );
  }

  if (intent === 'customer' && role !== 'customer') {
    return (
      <AccessDeniedScreen
        title="Customer access required"
        message="You signed in as Customer, but this account is a merchant admin. Choose Merchant on the login page to open the dashboard."
        onSignOut={() => {
          void signOut();
        }}
      />
    );
  }

  if (role === 'admin') {
    return (
      <MerchantDashboard
        onSignOut={signOut}
        merchantName={profile.full_name || user.user_metadata?.full_name || 'Merchant'}
        merchantEmail={profile.email || user.email || ''}
      />
    );
  }

  if (role === 'customer') {
    return <CustomerStorefront />;
  }

  return (
    <AccessDeniedScreen
      title="Access denied"
      message="This account has no valid portal role. Contact an administrator or sign out."
      onSignOut={() => {
        void signOut();
      }}
    />
  );
};

export const App: React.FC = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
