import { useState, useEffect } from "react";
import { Save, Store, User, Mail, Phone, MapPin, CreditCard } from "lucide-react";
import useStore from "../store/useStore";
import { StoreRepository } from "../repositories/StoreRepository";

export const SettingsPage = () => {
  const { currentStore, showToast } = useStore();
  
  const [formData, setFormData] = useState({
    name: "",
    ownerName: "",
    email: "",
    phone: "",
    address: "",
    currency: "GHS"
  });
  const [isSaving, setIsSaving] = useState(false);

  // 1. Load current store data into the form when the page loads
  useEffect(() => {
    if (currentStore) {
      setFormData({
        name: currentStore.name || "",
        ownerName: currentStore.ownerName || "",
        email: currentStore.email || "",
        phone: currentStore.phone || "",
        address: currentStore.address || "",
        currency: currentStore.currency || "GHS"
      });
    }
  }, [currentStore]);

  // 2. Handle the save action
  const handleSave = async () => {
    if (!formData.name.trim()) {
      showToast("⚠️ Business name is required!");
      return;
    }

    setIsSaving(true);
    try {
      // A. Update the database
      const updatedStore = await StoreRepository.update(currentStore.id, {
        name: formData.name.trim(),
        ownerName: formData.ownerName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        currency: formData.currency
      });

      // B. Update the global Zustand store so the whole app (like Layout sidebar) updates instantly
      useStore.getState().setCurrentStore(updatedStore);

      showToast("✅ Business profile updated successfully!");
    } catch (error) {
      console.error("Failed to save store:", error);
      showToast("❌ Failed to save business profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!currentStore) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <div className="bg-green-700 dark:bg-gray-900 text-white p-6 pb-8 rounded-b-[2rem] shadow-lg">
        <h1 className="text-2xl font-bold">Business Settings</h1>
        <p className="text-green-100 text-sm mt-1">Manage your store profile and preferences</p>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6 -mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          
          {/* Business Name */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Business Name *</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                value={formData.name} 
                onChange={(e) => handleChange("name", e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" 
                placeholder="e.g., Kwame's Provisions"
              />
            </div>
          </div>

          {/* Owner Name */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Owner Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                value={formData.ownerName} 
                onChange={(e) => handleChange("ownerName", e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" 
                placeholder="Your full name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="email" 
                value={formData.email} 
                onChange={(e) => handleChange("email", e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" 
                placeholder="store@example.com"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Business Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="tel" 
                value={formData.phone} 
                onChange={(e) => handleChange("phone", e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" 
                placeholder="024 123 4567"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Business Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
              <textarea 
                value={formData.address} 
                onChange={(e) => handleChange("address", e.target.value)} 
                rows="2"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white resize-none" 
                placeholder="Street, City, Region"
              />
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Default Currency</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <select 
                value={formData.currency} 
                onChange={(e) => handleChange("currency", e.target.value)} 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white appearance-none"
              >
                <option value="GHS">GHS (₵) - Ghana Cedi</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="NGN">NGN (₦) - Nigerian Naira</option>
                <option value="KES">KES (KSh) - Kenyan Shilling</option>
              </select>
            </div>
          </div>

          {/* Save Button */}
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg mt-4"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={20} /> Save Business Profile
              </>
            )}
          </button>

        </div>
      </div>
    </div>
  );
};