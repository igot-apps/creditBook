import { useState, useEffect } from "react";
import { X, Save, User, Phone, MapPin, FileText, Contact } from "lucide-react";
import useStore from "../store/useStore";
import { CustomerService } from "../services/CustomerService";
import { CustomerRepository } from "../repositories/CustomerRepository";
import { isValidPhone } from "../utils/helpers";

export const EditCustomerModal = ({ customer, onClose }) => {
  const { currentStore, refreshCustomers, setSelectedCustomer, showToast } = useStore();
  const [form, setForm] = useState({ name: "", phone: "", altPhone: "", address: "", notes: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (customer) {
      setForm({
        name: customer.name || "",
        phone: customer.phone || "",
        altPhone: customer.altPhone || "",
        address: customer.address || "",
        notes: customer.notes || ""
      });
    }
  }, [customer]);

  // 👇 NEW: Pick contact from phone's native contact list
  const handlePickContact = async () => {
    if (!('contacts' in navigator)) {
      showToast("Contact picker not supported on this device.");
      return;
    }

    try {
      const [contact] = await navigator.contacts.select(['tel'], { multiple: false });
      if (contact && contact.tel && contact.tel[0]) {
        let phoneNum = contact.tel[0];
        if (phoneNum.startsWith('tel:')) phoneNum = phoneNum.substring(4);
        
        setForm(prev => ({ ...prev, phone: phoneNum }));
        setError("");
      }
    } catch (err) {
      console.log("Contact picker cancelled");
    }
  };

  const handleSave = async () => {
    setError("");
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }

    // 👇 Professional Phone Validation
    if (!isValidPhone(form.phone)) {
      setError("Please enter a valid phone number (e.g., 024 123 4567).");
      return;
    }

    const existingCustomer = await CustomerRepository.getByPhone(currentStore.id, form.phone);
    if (existingCustomer && existingCustomer.id !== customer.id) {
      setError("This phone number is already used by another customer.");
      return;
    }

    setIsSaving(true);
    try {
      await CustomerService.updateCustomer(currentStore.id, customer.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        altPhone: form.altPhone.trim(),
        address: form.address.trim(),
        notes: form.notes.trim()
      });
      
      const refreshed = await refreshCustomers();
      const updated = refreshed.find(c => c.id === customer.id);
      if (updated) setSelectedCustomer(updated);
      
      showToast("Customer updated successfully");
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  if (!customer) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Edit Customer</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-3 rounded-xl text-sm font-semibold">{error}</div>}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" />
            </div>
          </div>

          {/* 👇 UPDATED: Phone Input with Contact Picker Button */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Phone *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="tel" 
                  inputMode="tel"
                  value={form.phone} 
                  onChange={e => setForm({...form, phone: e.target.value})} 
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" 
                />
              </div>
              <button 
                type="button"
                onClick={handlePickContact}
                className="flex-shrink-0 p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition active:scale-90"
                title="Pick from contacts"
              >
                <Contact size={20} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Alt. Phone (Optional)</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="tel" 
                inputMode="tel"
                value={form.altPhone} 
                onChange={e => setForm({...form, altPhone: e.target.value})} 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" 
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Address (Optional)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
              <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} rows="2" className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white resize-none" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Notes (Optional)</label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400" size={20} />
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows="3" placeholder="e.g., Prefers morning deliveries" className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white resize-none" />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-900">
          <button onClick={handleSave} disabled={isSaving} className="w-full bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={18} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
};