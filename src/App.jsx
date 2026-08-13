import { useEffect, useState } from "react";
import useStore from "./store/useStore";
import { BottomNav } from "./components/BottomNav";
import { Toast } from "./components/Toast";
import { Layout } from "./components/Layout";

// Auth Pages
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

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

import { AuthService } from "./services/AuthService";
import { supabase } from "./lib/supabaseClient";

const AppRouter = () => {
  const { view, setView, currentStore, setCurrentStore, theme, pageKey } = useStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Check initial session on app load
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsAuthenticated(true);
          const store = await AuthService.getStore(session.user.id);
          setCurrentStore(store);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // 2. Listen for auth state changes (login/logout in real-time)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        AuthService.getStore(session.user.id).then(setCurrentStore);
      } else {
        setIsAuthenticated(false);
        setCurrentStore(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setCurrentStore]);

  // Handle Dark/Light mode
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not authenticated, show Login or Register page
  if (!isAuthenticated) {
    if (view === "register") {
      return <RegisterPage />;
    }
    // Default to login if view is anything else (including 'home' before login)
    return <LoginPage />; 
  }

  // Authenticated: Render the main app
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
      default: return <HomePage key={pageKey} />;
    }
  };

  return (
    <Layout>
      {renderPage()}
      <BottomNav />
      <Toast />
    </Layout>
  );
};

export default function App() {
  return <AppRouter />;
}