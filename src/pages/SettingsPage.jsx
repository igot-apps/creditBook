import { useState, useEffect } from "react";
import { Save, Store, User, Phone, Mail, MapPin, DollarSign, Loader2, Crown, ChevronRight, Calendar, Zap, Check, AlertCircle } from "lucide-react";
import useStore from "../store/useStore";
import { supabase } from "../lib/supabaseClient";
import { SubscriptionService } from "../services/SubscriptionService";
import { TopBar } from "../components/TopBar";

export const SettingsPage = () => {
  const { currentStore, setCurrentStore, showToast, setView } = useStore();

  const [formData, setFormData] = useState({
    name: "",
    ownerName: "",
    phone: "",
    email: "",
    location: "",
    currency: "GH₵"
  });
  const [isSaving, setIsSaving] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  // Load current store data into the form
  useEffect(() => {
    if (currentStore) {
      setFormData({
        name: currentStore.name || "",
        // Handle both camelCase and snake_case from Supabase
        ownerName: currentStore.owner_name || currentStore.ownerName || "",
        phone: currentStore.phone || "",
        email: currentStore.email || "",
        location: currentStore.location || "",
        currency: currentStore.currency || "GH₵"
      });
    }
  }, [currentStore]);

  // Load subscription status
  useEffect(() => {
    if (currentStore?.id) {
      SubscriptionService.getSubscriptionStatus(currentStore.id)
        .then(setSubscriptionStatus)
        .catch(() => setSubscriptionStatus({ status: "none" }));
    }
  }, [currentStore?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast("⚠️ Business name is required");
      return;
    }
    setIsSaving(true);
    try {
      // 1. Update the database in Supabase
      const { data, error } = await supabase
        .from('stores')
        .update({
          name: formData.name,
          owner_name: formData.ownerName,
          phone: formData.phone,
          email: formData.email,
          location: formData.location,
          currency: formData.currency
        })
        .eq('id', currentStore.id)
        .select()
        .single();

      if (error) throw error;

      // 2. Update the global Zustand state instantly
      setCurrentStore(data);
      showToast("✅ Business details saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast("❌ Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // SUBSCRIPTION CARD (Active / Expired / Upgrade)
  // ==========================================
  const renderSubscriptionCard = () => {
    // Loading state
    if (!subscriptionStatus) {
      return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center gap-2">
          <Loader2 className="animate-spin text-indigo-600" size={18} />
          <span className="text-sm text-gray-500 dark:text-gray-400">Checking subscription...</span>
        </div>
      );
    }

    // ✅ ACTIVE
    if (subscriptionStatus.status === "active") {
      return (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5 rounded-2xl shadow-md text-white relative overflow-hidden">
          <Crown size={90} className="absolute -right-4 -bottom-6 opacity-10" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Crown size={22} />
            </div>
            <div>
              <p className="font-bold text-lg">Premium Active</p>
              <p className="text-xs text-green-100 capitalize">{subscriptionStatus.plan} Plan</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-green-100 mb-4">
            <span className="flex items-center gap-1"><Calendar size={12} /> {subscriptionStatus.days_remaining} days left</span>
            {subscriptionStatus.expires_at && (
              <span>Expires: {new Date(subscriptionStatus.expires_at).toLocaleDateString()}</span>
            )}
          </div>
          <button
            onClick={() => setView("subscription")}
            className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition"
          >
            Manage Subscription <ChevronRight size={16} />
          </button>
        </div>
      );
    }

    // ⚠️ EXPIRED
    if (subscriptionStatus.status === "expired") {
      return (
        <div className="bg-gradient-to-r from-red-600 to-orange-600 p-5 rounded-2xl shadow-md text-white relative overflow-hidden">
          <AlertCircle size={90} className="absolute -right-4 -bottom-6 opacity-10" />
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <AlertCircle size={22} />
            </div>
            <div>
              <p className="font-bold text-lg">Subscription Expired</p>
              <p className="text-xs text-red-100">Renew to keep using premium features</p>
            </div>
          </div>
          <button
            onClick={() => setView("subscription")}
            className="w-full bg-white text-red-600 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition"
          >
            <Zap size={16} /> Renew Now
          </button>
        </div>
      );
    }

    // 🆕 NONE — upgrade prompt
    return (
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 rounded-2xl shadow-md text-white relative overflow-hidden">
        <Crown size={90} className="absolute -right-4 -bottom-6 opacity-10" />
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-white/20 rounded-xl">
            <Crown size={22} />
          </div>
          <div>
            <p className="font-bold text-lg">Upgrade to Premium</p>
            <p className="text-xs text-indigo-100">Unlock the full power of your business</p>
          </div>
        </div>
        <div className="space-y-1.5 mb-4">
          {["Unlimited transactions", "Cloud backup & sync", "Priority support"].map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-indigo-100">
              <Check size={12} className="text-green-300" /> {f}
            </div>
          ))}
        </div>
        <button
          onClick={() => setView("subscription")}
          className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1 active:scale-95 transition"
        >
          View Plans <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Business Settings" showBack={true} onBack={() => setView("home")} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-6">

        {/* Header Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-3">
            {formData.name.charAt(0) || "S"}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Store Profile</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            This information will appear on receipts and shared account statements.
          </p>
        </div>

        {/* 👇 Subscription Card */}
        {renderSubscriptionCard()}

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
              <Store size={14} /> Business Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Shalom Cold Store"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
              <User size={14} /> Owner / Manager Name
            </label>
            <input
              type="text"
              name="ownerName"
              value={formData.ownerName}
              onChange={handleChange}
              placeholder="e.g., John Doe"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                <Phone size={14} /> Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="024XXXXXXX"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                <DollarSign size={14} /> Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white appearance-none"
              >
                <option value="GH₵">GH₵ (Cedi)</option>
                <option value="$">$ (USD)</option>
                <option value="€">€ (Euro)</option>
                <option value="£">£ (GBP)</option>
                <option value="₦">₦ (Naira)</option>
                <option value="KSh">KSh (Shilling)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
              <Mail size={14} /> Email (Optional)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="business@example.com"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
              <MapPin size={14} /> Location / Address (Optional)
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Main Street, Accra"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="animate-spin" size={20} /> Saving...
            </>
          ) : (
            <>
              <Save size={20} /> Save Business Details
            </>
          )}
        </button>
      </div>
    </div>
  );
};