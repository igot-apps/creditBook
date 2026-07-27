import { useState } from "react";
import { Store, Phone, ArrowRight } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { AuthService } from "../services/AuthService";

export const OnboardingPage = () => {
  const { showToast } = useApp();
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSetup = async (e) => {
    e.preventDefault();
    if (!businessName.trim() || !businessPhone.trim()) {
      showToast("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      // Get the email from the pending Google login session
      const pendingEmail = localStorage.getItem('cb_pending_google_email') || "owner@gmail.com";
      
      await AuthService.completeBusinessSetup(pendingEmail, businessName, businessPhone);
      localStorage.removeItem('cb_pending_google_email'); // Clean up
      
      showToast("Business setup complete!");
      window.location.reload(); // Reload to trigger AppContext to load the new store
    } catch (error) {
      console.error(error);
      showToast("Failed to setup business");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Store className="text-yellow-400 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome to CreditBook!</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Let's set up your business profile to get started.</p>
        </div>

        <form onSubmit={handleSetup} className="space-y-5">
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Business Name</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                required 
                value={businessName} 
                onChange={e => setBusinessName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                placeholder="e.g., Shalom Cloth Store"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1 block">Business Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="tel" 
                required 
                value={businessPhone} 
                onChange={e => setBusinessPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                placeholder="e.g., 024 000 0000"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>Continue <ArrowRight size={20} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};