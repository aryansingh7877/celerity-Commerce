import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProblemSection } from './components/ProblemSection';
import { SmartBasketDemo } from './components/SmartBasketDemo';
import { WorkflowSection } from './components/WorkflowSection';
import { ProductShowcase } from './components/ProductShowcase';
import { ComparisonSection } from './components/ComparisonSection';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { CustomerDashboard } from './components/CustomerDashboard';
import { MerchantDashboard } from './components/merchant/MerchantDashboard';
import { ShoppingBag, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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

const MainContent: React.FC<{ onOpenMerchant: () => void }> = ({ onOpenMerchant }) => {
  useEffect(() => {
    // Subtle GSAP scroll reveal for headlines and sections
    const elements = document.querySelectorAll('.fluid-section-title');
    elements.forEach((el) => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F8F3] text-[#101413] relative selection:bg-[#65B99B] selection:text-white">
      <Navbar onOpenMerchantDashboard={onOpenMerchant} />
      <main>
        <Hero />
        <ProblemSection />
        <SmartBasketDemo />
        <WorkflowSection />
        <ProductShowcase />
        <ComparisonSection />
      </main>
      <Footer />

      {/* Global Modals for authenticated users */}
      <AuthModal />
      <CustomerDashboard />
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, profile, isLoading, signOut } = useAuth();
  const [viewMode, setViewMode] = useState<'merchant' | 'storefront'>('merchant');

  // 1. Initial Supabase session restoration state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // 2. Authentication Gate: First screen visitors see MUST be Login / Signup
  if (!user) {
    return <AuthPage />;
  }

  // 3. Authenticated Merchant Dashboard
  if (viewMode === 'merchant') {
    return (
      <MerchantDashboard
        onExitToStorefront={() => setViewMode('storefront')}
        onSignOut={signOut}
        merchantName={profile?.full_name || user.user_metadata?.full_name || 'Aryan Singh'}
        merchantEmail={profile?.email || user.email || 'aryansingh787769@gmail.com'}
      />
    );
  }

  // 4. Authenticated Customer Storefront
  return <MainContent onOpenMerchant={() => setViewMode('merchant')} />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
