import { useState, useEffect } from "react";
import { X, User, Phone, Mail, MapPin } from "lucide-react";
import useStore from "../../store/useStore";
import { SupplierService } from "../../services/SupplierService";

export const AddSupplierModal = ({ isOpen, onClose, onSaved }) => {
  const { currentStore, showToast } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(""); setPhone(""); setEmail(""); setAddress("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      showToast("⚠️ Supplier name is required.");
      return;
    }
    setIsSaving(true);
    try {
      await SupplierService.addSupplier(currentStore.id, name.trim(), phone.trim(), { 
        email: email.trim(), 
        address: address.trim() 
      });
      showToast("✅ Supplier added successfully!");
      if (onSaved) onSaved(); // Refresh the list
      onClose();
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to add supplier.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Add New Supplier</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <X size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Supplier Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Adom ColdStore" className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" autoFocus />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="024 XXX XXXX" className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Email (Optional)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="supplier@email.com" className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Address (Optional)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
              <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Location..." className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white resize-none" rows="2" />
            </div>
          </div>
          <button onClick={handleSave} disabled={isSaving || !name.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg disabled:opacity-50">
            {isSaving ? "Saving..." : "Save Supplier"}
          </button>
        </div>
      </div>
    </div>
  );
};