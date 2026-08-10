import { useEffect } from "react";
import useStore from "./store/useStore";
import { BottomNav } from "./components/BottomNav";
import { Toast } from "./components/Toast";
import { Layout } from "./components/Layout";

import { HomePage } from "./pages/HomePage";

// Customer Pages
import { CustomersPage } from "./pages/CustomersPage";
import { CustomerProfilePage } from "./pages/CustomerProfilePage";
import { RecordSalePage } from "./pages/RecordSalePage";
import { RecordPaymentPage } from "./pages/RecordPaymentPage";
import { CustomerFollowUpsPage } from "./pages/CustomerFollowUpsPage";

// Product & Utility Pages
import { ProductsPage } from "./pages/ProductsPage";
import { VisibilityManagerPage } from "./pages/VisibilityManagerPage";
import { ReportsPage } from "./pages/ReportsPage";
import { MorePage } from "./pages/MorePage";

// Supplier Pages
import { SuppliersPage } from "./pages/SuppliersPage";
import { SupplierProfilePage } from "./pages/SupplierProfilePage";
import { RecordPurchasePage } from "./pages/RecordPurchasePage";
import { RecordSupplierPaymentPage } from "./pages/RecordSupplierPaymentPage";

const AppRouter = () => {
  const { view, initializeApp, theme, pageKey } = useStore();

  useEffect(() => {
    initializeApp();
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const renderPage = () => {
    switch (view) {
      case "home":
        return <HomePage key={pageKey} />;
      
      // Customer Routes
      case "customers":
        return <CustomersPage key={pageKey} />;
      case "profile":
        return <CustomerProfilePage key={pageKey} />;
      case "record":
        return <RecordSalePage key={pageKey} />;
      case "recordPayment":
        return <RecordPaymentPage key={pageKey} />;
      case "followups":
        return <CustomerFollowUpsPage key={pageKey} />;
      
      // Product & Utility Routes
      case "products":
        return <ProductsPage key={pageKey} />;
      case "visibilityManager":
        return <VisibilityManagerPage key={pageKey} />;
      case "reports":
        return <ReportsPage key={pageKey} />;
      case "settings":
        return <MorePage key={pageKey} />;
      
      // Supplier Routes
      case "suppliers":
        return <SuppliersPage key={pageKey} />;
      case "supplierProfile":
        return <SupplierProfilePage key={pageKey} />;
      case "recordSupplierPurchase":
        return <RecordPurchasePage key={pageKey} />;
      case "recordSupplierPayment":
        return <RecordSupplierPaymentPage key={pageKey} />;
      
      default:
        return <HomePage key={pageKey} />;
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