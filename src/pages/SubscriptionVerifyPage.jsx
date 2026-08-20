import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import useStore from "../store/useStore";
import { SubscriptionService } from "../services/SubscriptionService";

export const SubscriptionVerifyPage = () => {
  const { setView, showToast } = useStore();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your payment...");
  const [subscriptionData, setSubscriptionData] = useState(null);

  // Read what Paystack sent back (works on any host/device)
  const params = new URLSearchParams(window.location.search);
  const reference = params.get("trxref") || params.get("reference");
  const subscriptionId = params.get("subscription_id");

  useEffect(() => {
    if (reference && subscriptionId) verifyPayment();
    else { setStatus("error"); setMessage("Missing payment reference"); }
  }, []);

  const verifyPayment = async () => {
    setStatus("verifying");
    setMessage("Verifying your payment...");
    try {
      const result = await SubscriptionService.verifySubscription({ reference, subscriptionId });
      setSubscriptionData(result);
      setStatus("success");
      setMessage("Payment verified successfully!");
      showToast("✅ Subscription activated!");
      window.dispatchEvent(new Event("creditbook:subscription-changed"));
      // Clean the URL (no reload) and go back after 3s
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setView("subscription"), 3000);
    } catch (error) {
      console.error(error);
      setStatus("manual");
      setMessage(error.message || "Payment verification failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center space-y-6">

        <div className="flex justify-center">
          {status === "verifying" && <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={40} /></div>}
          {status === "success" && <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"><CheckCircle2 className="text-green-600 dark:text-green-400" size={40} /></div>}
          {status === "error" && <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center"><XCircle className="text-red-600 dark:text-red-400" size={40} /></div>}
          {status === "manual" && <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center"><AlertCircle className="text-yellow-600 dark:text-yellow-400" size={40} /></div>}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {status === "verifying" && "Verifying Payment"}
            {status === "success" && "Payment Successful!"}
            {status === "error" && "Payment Failed"}
            {status === "manual" && "Verification Needed"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
        </div>

        {status === "success" && subscriptionData && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-400">Plan:</span><span className="font-semibold text-gray-900 dark:text-white capitalize">{subscriptionData.plan}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-400">Expires:</span><span className="font-semibold text-gray-900 dark:text-white">{new Date(subscriptionData.expires_at).toLocaleDateString()}</span></div>
          </div>
        )}

        <div className="space-y-3">
          {status === "manual" && (
            <button onClick={verifyPayment} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
              <AlertCircle size={18} /> Try Verification Again
            </button>
          )}
          <button onClick={() => { window.history.replaceState({}, '', window.location.pathname); setView("subscription"); }}
            className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition">
            {status === "success" ? "Go to Subscription" : "Back to Subscription"}
          </button>
        </div>

        {reference && <p className="text-xs text-gray-500 dark:text-gray-400">Reference: {reference}</p>}
      </div>
    </div>
  );
};