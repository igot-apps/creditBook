import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";
import useStore from "./store/useStore";
import { BottomNav } from "./components/BottomNav";
import { Toast } from "./components/Toast";
import { Layout } from "./components/Layout";
import { PinSetupModal, QuickUnlockRecommendationModal, QuickUnlockScreen } from "./components/QuickUnlock";

// Auth Pages
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";

// Customer Pages
import { HomePage } from "./pages/HomePage";
import { CustomersPage } from "./pages/CustomersPage";
import { CustomerProfilePage } from "./pages/CustomerProfilePage";
import { RecordSalePage } from "./pages/RecordSalePage";
import { RecordPaymentPage } from "./pages/RecordPaymentPage";
import { CustomerFollowUpsPage } from "./pages/CustomerFollowUpsPage";

// Product & Utility Pages
import { ProductsPage } from "./pages/ProductsPage";
import { VisibilityManagerPage } from "./pages/VisibilityManagerPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

// Supplier Pages
import { SuppliersPage } from "./pages/SuppliersPage";
import { SupplierProfilePage } from "./pages/SupplierProfilePage";
import { RecordPurchasePage } from "./pages/RecordPurchasePage";
import { RecordSupplierPaymentPage } from "./pages/RecordSupplierPaymentPage";

// Subscription Pages
import { SubscriptionPage } from "./pages/SubscriptionPage";
import { SubscriptionVerifyPage } from "./pages/SubscriptionVerifyPage";
import { AdminSubscriptionPage } from "./pages/AdminSubscriptionPage";

import { AuthService } from "./services/AuthService";
import { SubscriptionService } from "./services/SubscriptionService";
import { AdminService } from "./services/AdminService";
import { supabase } from "./lib/supabaseClient";
import { QuickUnlockService } from "./services/QuickUnlockService";
import { PwaUpdatePrompt } from "./components/PwaUpdatePrompt";

// ==========================================
// View-Only banner — shows once per session, auto-hides after 8s, dismissible
// ==========================================
const ReadOnlyBanner = () => {
  const { readOnly, setView } = useStore();
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("creditbook_banner_dismissed") === "1"
  );

  const handleDismiss = () => {
    sessionStorage.setItem("creditbook_banner_dismissed", "1");
    setDismissed(true);
  };

  useEffect(() => {
    if (!readOnly) {
      sessionStorage.removeItem("creditbook_banner_dismissed");
      setDismissed(false);
    }
  }, [readOnly]);

  useEffect(() => {
    if (readOnly && !dismissed) {
      const t = setTimeout(handleDismiss, 8000);
      return () => clearTimeout(t);
    }
  }, [readOnly, dismissed]);

  if (!readOnly || dismissed) return null;

  return (
    <div className="fixed left-0 right-0 bottom-16 z-40 px-4 pb-2 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg p-3 flex items-center gap-2">
        <Eye size={18} className="text-white flex-shrink-0" />
        <p className="flex-1 text-xs font-semibold text-white leading-snug">
          Renew to unlock full access.
        </p>
        <button
          onClick={() => setView("subscription")}
          className="bg-white text-orange-600 text-xs font-bold px-3 py-2 rounded-lg active:scale-95 transition flex-shrink-0"
        >
          Renew
        </button>
        <button onClick={handleDismiss} className="text-white/80 p-1 flex-shrink-0" aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

const AppRouter = () => {
  const { view, setView, currentStore, setCurrentStore, theme, pageKey, showToast, setReadOnly, isSuperAdmin, setIsSuperAdmin } = useStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState(null);
  const [quickLocked, setQuickLocked] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinRecommendation, setShowPinRecommendation] = useState(false);

  const configureQuickUnlock = (userId) => {
    setAuthUserId(userId);
    const passwordLogin = sessionStorage.getItem('creditbook_password_login') === '1';
    if (passwordLogin) {
      sessionStorage.removeItem('creditbook_password_login');
      QuickUnlockService.markVerified(userId);
      setQuickLocked(false);
      if (!QuickUnlockService.hasPin(userId)) setShowPinRecommendation(true);
      return;
    }
    setQuickLocked(QuickUnlockService.hasPin(userId) && !QuickUnlockService.isVerifiedThisSession(userId));
  };

  // ==========================================
  // 1. AUTH CHECK (session + live auth changes)
  // ==========================================
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          configureQuickUnlock(session.user.id);
          const store = await AuthService.getStore(session.user.id);
          setCurrentStore(store);
          setIsSuperAdmin(await AdminService.isSuperAdmin().catch(() => false));
        } else {
          setIsAuthenticated(false);
          setAuthUserId(null);
          setQuickLocked(false);
          setIsSuperAdmin(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // 👇 NEW: Intercept password recovery and force the reset screen
      if (event === 'PASSWORD_RECOVERY') {
        setView('resetPassword');
      }

      if (session?.user) {
        setIsAuthenticated(true);
        configureQuickUnlock(session.user.id);
        AuthService.getStore(session.user.id).then(setCurrentStore);
        AdminService.isSuperAdmin().then(setIsSuperAdmin).catch(() => setIsSuperAdmin(false));
      } else {
        setIsAuthenticated(false);
        setAuthUserId(null);
        setQuickLocked(false);
        setShowPinSetup(false);
        setShowPinRecommendation(false);
        setCurrentStore(null);
        setIsSuperAdmin(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [setCurrentStore, setView, setIsSuperAdmin]);

  useEffect(() => {
    if (!isAuthenticated || !authUserId) return;
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt >= 15 * 60 * 1000 && QuickUnlockService.hasPin(authUserId)) {
        QuickUnlockService.clearSessionVerification(authUserId);
        setQuickLocked(true);
      }
      hiddenAt = 0;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isAuthenticated, authUserId]);

  // ==========================================
  // 2. SUBSCRIPTION ACCESS → VIEW-ONLY MODE & TRIAL WELCOME
  // ==========================================
  useEffect(() => {
    let cancelled = false;
    const loadAccess = async () => {
      if (!currentStore) { setReadOnly(false); return; }
      try {
        const access = await SubscriptionService.checkAccess(currentStore);
        if (cancelled) return;
        setReadOnly(!access.access); // 👈 the whole app respects this flag

        // 👇 NEW: One-time welcome message for new users on the 30-day trial
        if (access.status === 'trial') {
          const welcomeKey = `creditbook_trial_welcome_${currentStore.id}`;
          if (!localStorage.getItem(welcomeKey)) {
            showToast("🎉 Welcome! Enjoy your 30-day free trial.");
            localStorage.setItem(welcomeKey, 'true');
          }
        } else if (access.access && access.grace) {
          showToast(`⚠️ Subscription expired — ${access.grace_days_left} grace day(s) left. Renew now.`);
        } else if (access.status === "active" && (access.days_remaining ?? 99) <= 5) {
          showToast(`⚠️ Your plan expires in ${access.days_remaining} day(s). Renew soon.`);
        }
      } catch (error) {
        console.error("Subscription check failed:", error);
        if (!cancelled) setReadOnly(false); // never punish the user for a network glitch
      }
    };

    if (isAuthenticated) loadAccess();
    const onChange = () => loadAccess();
    window.addEventListener("creditbook:subscription-changed", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("creditbook:subscription-changed", onChange);
    };
  }, [isAuthenticated, currentStore, showToast, setReadOnly]);

  // ==========================================
  // 3. DETECT PAYSTACK REDIRECT-BACK → auto-open the verify screen
  // ==========================================
  useEffect(() => {
    if (isAuthenticated && currentStore) {
      const params = new URLSearchParams(window.location.search);
      const reference = params.get("trxref") || params.get("reference");
      const subscriptionId = params.get("subscription_id");
      if (reference && subscriptionId) {
        setView("subscriptionVerify");
      }
    }
  }, [isAuthenticated, currentStore, setView]);

  // ==========================================
  // 4. DETECT SUPABASE RECOVERY LINK REDIRECT (Fallback)
  // ==========================================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    if (viewParam === 'resetPassword') {
      setView('resetPassword');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [setView]);

  // ==========================================
  // 5. THEME (Dark / Light)
  // ==========================================
  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ==========================================
  // 6. UNAUTHENTICATED ROUTES (Includes Password Reset flows)
  // ==========================================
  if (!isAuthenticated) {
    if (view === "register") return <RegisterPage />;
    if (view === "forgotPassword") return <ForgotPasswordPage />;
    if (view === "resetPassword") return <ResetPasswordPage />;
    return <LoginPage />;
  }

  if (quickLocked && authUserId) {
    return <QuickUnlockScreen userId={authUserId} onUnlocked={() => setQuickLocked(false)} onUsePassword={async () => {
      await supabase.auth.signOut({ scope: 'local' });
      setView('home');
    }} />;
  }

  // ==========================================
  // 7. AUTHENTICATED ROUTER
  // ==========================================
  const renderPage = () => {
    switch (view) {
      case "home": return <HomePage key={pageKey} />;
      case "customers": return <CustomersPage key={pageKey} />;
      case "profile": return <CustomerProfilePage key={pageKey} />;
      case "record": return <RecordSalePage key={pageKey} />;
      case "recordPayment": return <RecordPaymentPage key={pageKey} />;
      case "followups": return <CustomerFollowUpsPage key={pageKey} />;
      case "products": return <ProductsPage key={pageKey} />;
      case "visibilityManager": return <VisibilityManagerPage key={pageKey} />;
      case "reports": return <ReportsPage key={pageKey} />;
      case "settings": return <SettingsPage key={pageKey} />;
      case "suppliers": return <SuppliersPage key={pageKey} />;
      case "supplierProfile": return <SupplierProfilePage key={pageKey} />;
      case "recordSupplierPurchase": return <RecordPurchasePage key={pageKey} />;
      case "recordSupplierPayment": return <RecordSupplierPaymentPage key={pageKey} />;
      case "subscription": return <SubscriptionPage key={pageKey} />;
      case "subscriptionVerify": return <SubscriptionVerifyPage key={pageKey} />;
      case "adminSubscriptions": return isSuperAdmin ? <AdminSubscriptionPage key={pageKey} /> : <SettingsPage key={pageKey} />;
      // Fallback for auth pages if accessed while logged in
      case "forgotPassword": return <ForgotPasswordPage />;
      case "resetPassword": return <ResetPasswordPage />;
      default: return <HomePage key={pageKey} />;
    }
  };

  return (
    <Layout>
      {renderPage()}
      <ReadOnlyBanner />
      <BottomNav />
      <Toast />
      <PwaUpdatePrompt />
      {showPinRecommendation && <QuickUnlockRecommendationModal onClose={() => setShowPinRecommendation(false)} onSetUp={() => { setShowPinRecommendation(false); setShowPinSetup(true); }} />}
      {showPinSetup && authUserId && <PinSetupModal userId={authUserId} onClose={() => setShowPinSetup(false)} onSaved={() => showToast('✅ Quick unlock PIN is ready')} />}
    </Layout>
  );
};

export default function App() {
  return <AppRouter />;
}
