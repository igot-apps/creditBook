import { AppProvider, useApp } from "./contexts/AppContext";
import { BottomNav } from "./components/BottomNav";
import { Toast } from "./components/Toast";
import { OnboardingPage } from "./pages/OnboardingPage";
import { HomePage } from "./pages/HomePage";
import { CustomersPage } from "./pages/CustomersPage";
import { RecordPage } from "./pages/RecordPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { FollowUpsPage } from "./pages/FollowUpsPage";

const AppRouter = () => {
  const { view, isLoading } = useApp();

  if (isLoading && view !== "record") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-green-700 dark:text-green-400 font-bold text-xl animate-pulse">Loading CreditBook...</div>
      </div>
    );
  }

  const renderPage = () => {
    switch (view) {
      case "onboarding": return <OnboardingPage />;
      case "home": return <><HomePage /><BottomNav /></>;
      case "customers": return <><CustomersPage /><BottomNav /></>;
      case "record": return <RecordPage />;
      case "profile": return <ProfilePage />;
      case "reports": return <><ReportsPage /><BottomNav /></>;
      case "settings": return <><SettingsPage /><BottomNav /></>;
      case "followups": return <><FollowUpsPage /><BottomNav /></>;
      default: return <><HomePage /><BottomNav /></>;
    }
  };

  return (
    <>
      {renderPage()}
      <Toast />
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
    </AppProvider>
  );
}