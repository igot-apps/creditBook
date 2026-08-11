import { useState, useEffect } from "react";
import { X, Truck, Phone, Save } from "lucide-react";
import useStore from "../../store/useStore";
import { SupplierService } from "../../services/SupplierService";

export const AddSupplierModal = ({ isOpen, onClose, onSaved, supplier }) => {
  const { currentStore, showToast } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setName(supplier.name || "");
        setPhone(supplier.phone || "");
      } else {
        setName("");
        setPhone("");
      }
    }
  }, [isOpen, supplier]);

  const handleSave = async () => {
    if (!name.trim()) {
      showToast("⚠️ Name is required");
      return;
    }
    setIsSaving(true);
    try {
      if (supplier) {
        await SupplierService.update(supplier.id, { name, phone });
        showToast("✅ Supplier updated successfully");
      } else {
        await SupplierService.addSupplier(currentStore.id, name, phone);
        showToast("✅ Supplier added successfully");
      }
      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to save supplier");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl p-6 animate-in slide-in-from-bottom-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {supplier ? "Edit Supplier" : "Add New Supplier"}
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <X size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
              <Truck size={14} /> Business / Supplier Name
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g., Adom Cold Store"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              autoFocus
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5">
              <Phone size={14} /> Phone Number (Optional)
            </label>
            <input 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="e.g., 024XXXXXXX"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg mt-4"
          >
            <Save size={18} /> {isSaving ? "Saving..." : (supplier ? "Update Supplier" : "Save Supplier")}
          </button>
        </div>
      </div>
    </div>
  );
};