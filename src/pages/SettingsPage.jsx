import { useState, useEffect } from "react";
import { Save, Store, User, Phone, Mail, MapPin, DollarSign, CheckCircle } from "lucide-react";
import useStore from "../store/useStore";
import { db } from "../database/db";
import { TopBar } from "../components/TopBar";

export const SettingsPage = () => {
  const { currentStore, setCurrentStore, showToast } = useStore();
  
  const [formData, setFormData] = useState({
    name: "",
    ownerName: "",
    phone: "",
    email: "",
    location: "",
    currency: "GH₵"
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load current store data into the form
  useEffect(() => {
    if (currentStore) {
      setFormData({
        name: currentStore.name || "",
        ownerName: currentStore.ownerName || "",
        phone: currentStore.phone || "",
        email: currentStore.email || "",
        location: currentStore.location || "",
        currency: currentStore.currency || "GH₵"
      });
    }
  }, [currentStore]);

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
      // 1. Update the database
      await db.stores.update(currentStore.id, formData);
      
      // 2. Update the global Zustand state
      const updatedStore = { ...currentStore, ...formData };
      setCurrentStore(updatedStore);
      
      showToast("✅ Business details saved successfully!");
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast("❌ Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Business Settings" showBack={true} onBack={() => window.history.back()} />
      
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

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
              <Store size={14} /> Business Name
            </label>
            <input 
              type="text" name="name" value={formData.name} onChange={handleChange} 
              placeholder="e.g., Shalom Cold Store"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
              <User size={14} /> Owner / Manager Name
            </label>
            <input 
              type="text" name="ownerName" value={formData.ownerName} onChange={handleChange} 
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
                type="tel" name="phone" value={formData.phone} onChange={handleChange} 
                placeholder="024XXXXXXX"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
                <DollarSign size={14} /> Currency
              </label>
              <select 
                name="currency" value={formData.currency} onChange={handleChange}
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
              type="email" name="email" value={formData.email} onChange={handleChange} 
              placeholder="business@example.com"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
              <MapPin size={14} /> Location / Address (Optional)
            </label>
            <input 
              type="text" name="location" value={formData.location} onChange={handleChange} 
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
            <>Saving...</>
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