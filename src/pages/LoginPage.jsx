import { useState } from "react";
import { Store } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { AuthService } from "../services/AuthService";

export const LoginPage = () => {
  const { setView, showToast } = useApp();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await AuthService.loginWithGoogle();
      
      if (result.isNew) {
        // New user: save email temporarily and route to onboarding
        localStorage.setItem('cb_pending_google_email', result.user.email);
        setView("onboarding");
      } else {
        // Existing user: session is already set, just reload to initialize the app
        window.location.reload(); 
      }
    } catch (err) {
      console.error(err);
      showToast("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 text-center">
        <div className="w-20 h-20 bg-green-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Store className="text-yellow-400 w-10 h-10" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">CreditBook</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">The smart way to manage market sales and debts.</p>

        <button 
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold py-3.5 rounded-xl border border-gray-300 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              {/* Official Google "G" Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};