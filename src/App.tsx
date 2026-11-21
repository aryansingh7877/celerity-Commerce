import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { MerchantDashboard } from './components/merchant/MerchantDashboard';
import { CustomerStorefront } from './components/storefront/CustomerStorefront';
import { BrandLogo } from './components/common/BrandLogo';
import { MfaChallenge } from './components/auth/MfaChallenge';
import { Loader2 } from 'lucide-react';

const LoadingScreen: React.FC = () => (
  <div className="h-screen w-full bg-[#070A09] flex flex-col items-center justify-center text-white select-none">
    <div className="relative w-14 h-14 rounded-2xl bg-[#DCEFE3]/15 border border-[#65B99B]/30 flex items-center justify-center shadow-lg shadow-[#65B99B]/20 mb-4 animate-pulse p-1.5">
      <BrandLogo className="w-full h-full" />
    </div>
    <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#65B99B] uppercase">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#65B99B]" />
      <span>Connecting to Celerity Mesh...</span>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { user, session, profile, isLoading, signOut, mfaPending, completeMfa } = useAuth();
  // Dual-mode: any signed-in user can open Admin or Customer view
  const [viewMode, setViewMode] = useState<'merchant' | 'storefront'>('merchant');

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Require a real Supabase JWT — API calls need Bearer token
  if (!session?.access_token || !user) {
    return <AuthPage />;
  }

  if (mfaPending) {
    return (
      <MfaChallenge
        onVerified={async () => {
          await completeMfa();
        }}
        onCancel={async () => {
          await signOut();
        }}
      />
    );
  }

  if (viewMode === 'merchant') {
    return (
      <MerchantDashboard
        onExitToStorefront={() => setViewMode('storefront')}
        onSignOut={signOut}
        merchantName={profile?.full_name || user.user_metadata?.full_name || 'Merchant'}
        merchantEmail={profile?.email || user.email || ''}
      />
    );
  }

  return <CustomerStorefront onOpenMerchant={() => setViewMode('merchant')} />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
