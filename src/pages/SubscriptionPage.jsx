import { useState, useEffect } from "react";
import { Check, CreditCard, Crown, Loader2, AlertCircle, Calendar, Zap, RefreshCw } from "lucide-react";
import useStore from "../store/useStore";
import { SubscriptionService, PLANS } from "../services/SubscriptionService";
import { formatCurrency } from "../utils/helpers";
import { TopBar } from "../components/TopBar";

export const SubscriptionPage = () => {
  const { currentStore, setView, showToast } = useStore();

  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [email, setEmail] = useState(currentStore?.email || "");
  const [phone, setPhone] = useState(currentStore?.phone || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  // 👇 Manual verification state (no-webhook fallback)
  const [manualRef, setManualRef] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Reusable loader so we can refresh after actions
  const loadSubscriptionStatus = () => {
    if (!currentStore?.id) return;
    SubscriptionService.getSubscriptionStatus(currentStore.id)
      .then(setSubscriptionStatus)
      .catch(() => setSubscriptionStatus({ status: "none" }))
      .finally(() => setLoadingStatus(false));
  };

  useEffect(() => {
    loadSubscriptionStatus();
  }, [currentStore?.id]);

  // 1️⃣ Start a new subscription payment (redirects to Paystack)
  const handleSubscribe = async () => {
    if (!email || !phone) {
      showToast("⚠️ Please fill in email and phone number");
      return;
    }
    setIsProcessing(true);
    try {
      const result = await SubscriptionService.initializeSubscription({
        storeId: currentStore.id,
        plan: selectedPlan,
        email,
        phone,
      });
      // 👇 Redirect to Paystack (they redirect back to the app with ?trxref=...)
      window.location.href = result.authorization_url;
    } catch (error) {
      console.error(error);
      showToast("❌ " + error.message);
      setIsProcessing(false);
    }
  };

  // 2️⃣ Manual verification (user pastes Paystack reference)
  const handleManualVerify = async () => {
    if (!manualRef.trim() || !subscriptionStatus?.id) return;
    setIsVerifying(true);
    try {
      await SubscriptionService.verifySubscription({
        reference: manualRef.trim(),
        subscriptionId: subscriptionStatus.id,
      });
      showToast("✅ Payment verified — subscription active!");
      // 👇 Tell App.jsx to re-check access (unlocks the gate)
      window.dispatchEvent(new Event("creditbook:subscription-changed"));
      setManualRef("");
      loadSubscriptionStatus();
    } catch (error) {
      console.error(error);
      showToast("❌ " + error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const plans = [
    {
      id: "monthly",
      name: "Monthly",
      price: PLANS.monthly.amount,
      duration: "30 days",
      features: ["Unlimited transactions", "Cloud backup", "Priority support"],
      popular: false,
    },
    {
      id: "yearly",
      name: "Yearly",
      price: PLANS.yearly.amount,
      duration: "365 days",
      features: ["Unlimited transactions", "Cloud backup", "Priority support", "2 months free"],
      popular: true,
    },
  ];
  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  if (loadingStatus) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Subscription" showBack={true} onBack={() => setView("settings")} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-6">

        {/* Current Subscription Status Card */}
        {subscriptionStatus && subscriptionStatus.status !== 'none' && (
          <div className={`p-5 rounded-2xl shadow-sm border-2 ${
            subscriptionStatus.status === 'active'
              ? 'bg-green-50 dark:bg-green-900/10 border-green-300 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${subscriptionStatus.status === 'active' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                {subscriptionStatus.status === 'active' ? <Crown className="text-green-600 dark:text-green-400" size={24} /> : <AlertCircle className="text-red-600 dark:text-red-400" size={24} />}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                  {subscriptionStatus.status === 'active' ? 'Active Subscription' : 'Subscription Expired'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 capitalize">{subscriptionStatus.plan} Plan</p>
                {subscriptionStatus.status === 'active' && (
                  <div className="flex items-center gap-2 mt-2">
                    <Calendar size={14} className="text-gray-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{subscriptionStatus.days_remaining} days remaining</span>
                  </div>
                )}
                {subscriptionStatus.expires_at && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Expires: {new Date(subscriptionStatus.expires_at).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 👇 NEW: Manual Verification Card (no-webhook fallback) */}
        {subscriptionStatus && subscriptionStatus.id && subscriptionStatus.status !== "active" && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border-2 border-dashed border-indigo-200 dark:border-indigo-800 space-y-3">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <RefreshCw size={18} className="text-indigo-600 dark:text-indigo-400" /> Already paid?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Paste your Paystack reference (from your MoMo confirmation SMS) to verify manually.
            </p>
            <input
              value={manualRef}
              onChange={(e) => setManualRef(e.target.value)}
              placeholder="e.g., T1234567890ABC"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm font-mono"
            />
            <button
              onClick={handleManualVerify}
              disabled={!manualRef.trim() || isVerifying}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
            >
              {isVerifying ? <><Loader2 className="animate-spin" size={18} /> Verifying...</> : "Verify Payment"}
            </button>
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Choose Your Plan</h1>
          <p className="text-gray-600 dark:text-gray-400">Unlock premium features for your business</p>
        </div>

        {/* Plan Cards */}
        <div className="space-y-4">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full p-5 rounded-2xl border-2 transition-all text-left relative ${
                selectedPlan === plan.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md">
                  MOST POPULAR
                </div>
              )}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{plan.duration}</p>
                </div>
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(plan.price, "GH₵")}</span>
              </div>
              <div className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Check size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                  </div>
                ))}
              </div>
              {selectedPlan === plan.id && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Contact / Payment Details */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard size={18} className="text-indigo-600" /> Payment Details
          </h3>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Phone Number (MoMo) *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="024 123 4567"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
            />
          </div>
        </div>

        {/* Subscribe Button */}
        <button
          onClick={handleSubscribe}
          disabled={isProcessing || !email || !phone}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? <><Loader2 className="animate-spin" size={20} /> Processing...</> : <><Zap size={20} /> Subscribe for {formatCurrency(selectedPlanData.price, "GH₵")}</>}
        </button>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          You'll be redirected to Paystack to complete payment, then returned here for automatic confirmation.
        </p>
      </div>
    </div>
  );
};