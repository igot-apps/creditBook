import { useState, useEffect } from "react";
import { X, Save, User, Phone } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { CustomerService } from "../services/CustomerService";

export const EditCustomerModal = ({ customer, onClose }) => {
  const { currentStore, refreshCustomers, setSelectedCustomer, showToast } = useApp();
  const [form, setForm] = useState({ name: "", phone: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || "",
        phone: customer.phone || ""
      });
    }
  }, [customer]);

  const handleSave = async () => {
    setError("");
    
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!form.phone.trim()) {
      setError("Phone number is required");
      return;
    }

    setIsSaving(true);
    try {
      await CustomerService.updateCustomer(currentStore.id, customer.id, {
        name: form.name.trim(),
        phone: form.phone.trim()
      });
      
      // Refresh the customer list
      const refreshed = await refreshCustomers();
      
      // Update the selectedCustomer with new data
      const updated = refreshed.find(c => c.id === customer.id);
      if (updated) {
        setSelectedCustomer(updated);
      }
      
      showToast("Customer updated successfully");
      onClose();
    } catch (err) {
      console.error("Failed to update customer:", err);
      setError("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (!customer) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Edit Customer</h3>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <X size={20} className="text-gray-700 dark:text-gray-200" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
              Customer Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                placeholder="Enter customer name"
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
                placeholder="024 000 0000"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-green-700 text-white font-bold py-3 rounded-xl hover:bg-green-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};