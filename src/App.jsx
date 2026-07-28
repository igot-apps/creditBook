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

const AppRouter = () => {
  const { view, initializeApp, theme } = useStore();

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Handle theme
  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  const renderPage = () => {
    switch (view) {
      case "home": return <HomePage />;
      case "customers": return <CustomersPage />;
      case "products": return <ProductsPage />;
      case "record": return <RecordPage />;
      case "profile": return <ProfilePage />;
      case "reports": return <ReportsPage />;
      case "settings": return <SettingsPage />;
      case "followups": return <FollowUpsPage />;
      default: return <HomePage />;
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