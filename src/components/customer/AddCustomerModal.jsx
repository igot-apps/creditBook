import { useState } from "react";
import { X, UserPlus } from "lucide-react";
import useStore from "../../store/useStore";
import { ContactService } from "../../services/ContactService";

export const AddCustomerModal = ({ isOpen, onClose }) => {
  const { currentStore, showToast, refreshCustomers } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      showToast("⚠️ Customer name is required");
      return;
    }

    try {
      await ContactService.create(currentStore.id, {
        name: name.trim(),
        phone: phone.trim(),
        type: "customer"
      });
      
      showToast("✅ Customer added successfully!");
      setName("");
      setPhone("");
      
      // Refresh the customer list in the global store
      await refreshCustomers();
      onClose();
    } catch (error) {
      console.error("Failed to add customer:", error);
      showToast("❌ Failed to add customer.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Add New Customer</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <X size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Customer Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Kwame Mensah"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm"
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Phone Number (Optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., 0244123456"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg mt-2"
          >
            <UserPlus size={18} /> Save Customer
          </button>
        </div>
      </div>
    </div>
  );
};