import { useEffect } from "react";
import useStore from "./store/useStore";
import { BottomNav } from "./components/BottomNav";
import { Toast } from "./components/Toast";
import { Layout } from "./components/Layout";

import { HomePage } from "./pages/HomePage";
import { CustomersPage } from "./pages/CustomersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { RecordPage } from "./pages/RecordPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { FollowUpsPage } from "./pages/FollowUpsPage";

// Supplier Pages
import { SuppliersPage } from "./pages/SuppliersPage";
import { SupplierProfilePage } from "./pages/SupplierProfilePage";
import { RecordPurchasePage } from "./pages/RecordPurchasePage";

const AppRouter = () => {
  const { view, initializeApp, theme, pageKey } = useStore();

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  const renderPage = () => {
    switch (view) {
      case "home": return <HomePage key={pageKey} />;
      case "customers": return <CustomersPage key={pageKey} />;
      case "products": return <ProductsPage key={pageKey} />;
      case "record": return <RecordPage key={pageKey} />;
      case "profile": return <ProfilePage key={pageKey} />;
      case "reports": return <ReportsPage key={pageKey} />;
      case "settings": return <SettingsPage key={pageKey} />;
      case "followups": return <FollowUpsPage key={pageKey} />;
      
      // Supplier Routes
      case "suppliers": return <SuppliersPage key={pageKey} />;
      case "supplierProfile": return <SupplierProfilePage key={pageKey} />;
      case "recordSupplierPurchase": return <RecordPurchasePage key={pageKey} />;
      
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