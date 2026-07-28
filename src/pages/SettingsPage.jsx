import { useState } from "react";
import { Store, User, Mail, Phone, Save, AlertCircle } from "lucide-react";
import useStore from "../store/useStore"; // 👈 CHANGED
import { PageHeader } from "../components/PageHeader";

export const SettingsPage = () => {
  const { currentStore, setCurrentStore, showToast, setView } = useStore(); // 👈 CHANGED
  const [form, setForm] = useState({
    name: currentStore?.name || "",
    ownerName: currentStore?.ownerName || "",
    email: currentStore?.email || "",
    phone: currentStore?.phone || ""
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Update local state (In a full app, you'd also save this to IndexedDB via a service)
      const updatedStore = { ...currentStore, ...form };
      setCurrentStore(updatedStore);
      showToast("Settings saved successfully!");
    } catch (error) {
      console.error(error);
      showToast("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentStore) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Settings" subtitle="Manage your business profile" />

      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold text-xl">
              {currentStore.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white text-lg">Business Profile</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Update your store details</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Business Name</label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Owner Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  value={form.ownerName} 
                  onChange={e => setForm({...form, ownerName: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Email (Optional)</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="email"
                  value={form.email} 
                  onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="tel"
                  value={form.phone} 
                  onChange={e => setForm({...form, phone: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSaving}
              className="w-full bg-green-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-70 mt-4"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={20} /> Save Changes
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-2xl flex items-start gap-3">
          <AlertCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-bold text-sm text-blue-800 dark:text-blue-300">Offline Mode Active</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              All your data is stored securely on this device. No internet connection is required to use CreditBook.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};