import { AppProvider, useApp } from "./contexts/AppContext";
import { BottomNav } from "./components/BottomNav";
import { Toast } from "./components/Toast";
import { Layout } from "./components/Layout"; // 👈 Add this
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { HomePage } from "./pages/HomePage";
import { CustomersPage } from "./pages/CustomersPage";
import { RecordPage } from "./pages/RecordPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { FollowUpsPage } from "./pages/FollowUpsPage";

const AppRouter = () => {
  const { view, isLoading, handleLogout } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-green-700 dark:text-green-400 font-bold text-xl animate-pulse">Loading CreditBook...</div>
      </div>
    );
  }

  if (view === "login") return <LoginPage />;
  if (view === "register") return <RegisterPage />;

  const renderPage = () => {
    switch (view) {
      case "home": return <HomePage />;
      case "customers": return <CustomersPage />;
      case "record": return <RecordPage />;
      case "profile": return <ProfilePage />;
      case "reports": return <ReportsPage />;
      case "settings": return <SettingsPage onLogout={handleLogout} />;
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
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}