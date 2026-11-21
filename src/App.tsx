import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { MerchantDashboard } from './components/merchant/MerchantDashboard';
import { CustomerStorefront } from './components/storefront/CustomerStorefront';
import { ShoppingBag, Loader2 } from 'lucide-react';

const LoadingScreen: React.FC = () => (
  <div className="h-screen w-full bg-[#070A09] flex flex-col items-center justify-center text-white select-none">
    <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#65B99B] to-[#C8E8D9] flex items-center justify-center shadow-lg shadow-[#65B99B]/25 mb-4 animate-pulse">
      <ShoppingBag className="w-6 h-6 text-[#0A2540] stroke-[2.2]" />
    </div>
    <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#65B99B] uppercase">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#65B99B]" />
      <span>Connecting to Celerity Mesh...</span>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { user, profile, isLoading, signOut } = useAuth();
  const [viewMode, setViewMode] = useState<'merchant' | 'storefront'>('storefront');

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthPage />;
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
