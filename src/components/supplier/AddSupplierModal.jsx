import { useState, useEffect } from "react";
import { X, Truck, Loader2, AlertTriangle } from "lucide-react";
import useStore from "../../store/useStore";
import { SupplierService } from "../../services/SupplierService";

// Normalize phone: keep digits only ("024 123 4567" === "0241234567")
const normalizePhone = (phone) => (phone || "").replace(/\D/g, "");

export const AddSupplierModal = ({ isOpen, onClose, onSaved, supplier }) => {
  const { currentStore, showToast } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");

  // Populate for edit mode / reset for create mode
  useEffect(() => {
    if (isOpen) {
      setName(supplier?.name || "");
      setPhone(supplier?.phone || "");
      setDuplicateError("");
    }
  }, [isOpen, supplier]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      showToast("⚠️ Supplier name is required");
      return;
    }

    setIsSaving(true);
    try {
      // 👇 DUPLICATE PHONE CHECK (create & edit, excludes the supplier being edited)
      const normalizedPhone = normalizePhone(phone);
      if (normalizedPhone.length >= 9) {
        const allSuppliers = await SupplierService.getAll({ fetchAll: true });
        const duplicate = (Array.isArray(allSuppliers) ? allSuppliers : []).find(s => {
          const existingPhone = normalizePhone(s.phone);
          return existingPhone.length >= 9 && existingPhone === normalizedPhone && s.id !== supplier?.id;
        });

        if (duplicate) {
          setDuplicateError(`A supplier with this phone number already exists: "${duplicate.name}"`);
          showToast(`⚠️ "${duplicate.name}" already uses this phone number`);
          setIsSaving(false);
          return; // 🛑 Block the save
        }
      }

      setDuplicateError("");

      if (supplier?.id) {
        // EDIT MODE
        await SupplierService.update(supplier.id, { name: name.trim(), phone: phone.trim() });
        showToast("✅ Supplier updated");
      } else {
        // CREATE MODE
        await SupplierService.addSupplier(currentStore.id, name.trim(), phone.trim());
        showToast("✅ Supplier added");
      }

      // Notify the page so it refreshes its list immediately
      if (onSaved) onSaved();
      onClose();
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to save supplier");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <Truck size={20} className="text-indigo-600 dark:text-indigo-400" />
            {supplier?.id ? "Edit Supplier" : "Add Supplier"}
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <X size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Supplier Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Adom ColdStore, Delta Drinks"
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
              autoFocus
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Phone (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setDuplicateError(""); }}
              placeholder="e.g., 024 123 4567"
              className={`w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border rounded-lg outline-none focus:ring-2 dark:text-white text-sm ${
                duplicateError
                  ? "border-red-400 focus:ring-red-500"
                  : "border-gray-200 dark:border-gray-700 focus:ring-indigo-500"
              }`}
            />
            {/* 👇 Visible duplicate warning under the phone field */}
            {duplicateError && (
              <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 flex items-start gap-1.5">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> {duplicateError}
              </p>
            )}
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg disabled:opacity-60"
          >
            {isSaving ? <><Loader2 className="animate-spin" size={18} /> Checking & Saving...</> : <>{supplier?.id ? "Update Supplier" : "Save Supplier"}</>}
          </button>
        </div>
      </div>
    </div>
  );
};