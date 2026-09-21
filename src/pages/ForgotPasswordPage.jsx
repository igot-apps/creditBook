import { useState } from "react";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import useStore from "../store/useStore";
import { TopBar } from "../components/TopBar";

export const ForgotPasswordPage = () => {
  const { setView, showToast } = useStore();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleResetRequest = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast("⚠️ Please enter your email address");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/?view=resetPassword`,
      });
      if (error) throw error;
      setIsSent(true);
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      <TopBar title="Reset Password" showBack={true} onBack={() => setView("login")} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          {!isSent ? (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Mail size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Forgot Password?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>
              <form onSubmit={handleResetRequest} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-60"
                >
                  {isLoading ? <><Loader2 className="animate-spin" size={20} /> Sending...</> : "Send Reset Link"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Check Your Email</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                We've sent a password reset link to <strong className="text-gray-900 dark:text-white">{email}</strong>.
              </p>
              <button
                onClick={() => setView("login")}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <ArrowLeft size={18} /> Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};