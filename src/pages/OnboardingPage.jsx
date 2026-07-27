import { Store, Check } from "lucide-react";
import { useApp } from "../contexts/AppContext";

export const OnboardingPage = () => {
  const { setView } = useApp();

  const completeOnboarding = () => {
    localStorage.setItem("cb_onboarded", "true");
    setView("home");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-green-700 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
        <Store className="text-yellow-400 w-12 h-12" />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">CreditBook</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">The smart way to manage market sales and debts.</p>
      <div className="space-y-4 w-full max-w-sm">
        {["Track customers easily", "Never forget who owes you", "Send WhatsApp & SMS reminders yourself"].map((text, i) => (
          <div key={i} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
            <Check className="text-green-600 w-6 h-6 flex-shrink-0" />
            <span className="text-gray-800 dark:text-white font-medium text-lg text-left">{text}</span>
          </div>
        ))}
      </div>
      <button onClick={completeOnboarding} className="mt-10 w-full max-w-sm bg-green-700 text-white font-bold text-xl py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">
        Get Started
      </button>
    </div>
  );
};