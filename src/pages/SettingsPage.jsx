import { useState, useEffect } from "react";
import { Download, Upload, Moon, Sun, Bell, LogOut } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { StoreRepository } from "../repositories/StoreRepository";
import { CustomerRepository } from "../repositories/CustomerRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";
import { PageHeader } from "../components/PageHeader";

export const SettingsPage = ({ onLogout }) => {
  const { currentStore, setCurrentStore, theme, setTheme, showToast } = useApp();
  const [form, setForm] = useState({ name: "", ownerName: "", email: "", phone: "" });

  useEffect(() => {
    if (currentStore) {
      setForm({
        name: currentStore.name || "",
        ownerName: currentStore.ownerName || "",
        email: currentStore.email || "",
        phone: currentStore.phone || ""
      });
    }
  }, [currentStore]);

  const saveSettings = async () => {
    if (!currentStore) return;
    const updated = { ...currentStore, ...form };
    
    // Update the store record in IndexedDB
    const { db } = await import("../database/db");
    await db.stores.put(updated);
    
    setCurrentStore(updated);
    showToast("Settings saved");
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      showToast("Notifications not supported");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification("CreditBook", { body: "Notifications enabled! We'll remind you about follow-ups." });
      showToast("Notifications enabled");
    } else {
      showToast("Permission denied");
    }
  };

  const backupData = async () => {
    if (!currentStore) return;
    const storeId = currentStore.id;
    const allCustomers = await CustomerRepository.getAll(storeId);
    const allTx = [];
    for (const c of allCustomers) {
      const txs = await TransactionRepository.getByCustomerId(storeId, c.id);
      allTx.push(...txs);
    }
    
    const data = {
      store: currentStore,
      customers: allCustomers,
      transactions: allTx,
      exportDate: new Date().toISOString(),
      version: "2.0"
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `creditbook-backup-${currentStore.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded");
  };

  const restoreData = async (e) => {
    if (!currentStore) return;
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.customers || !data.store) {
        showToast("Invalid backup file");
        return;
      }

      const storeId = currentStore.id;
      for (const customer of data.customers) {
        const { id, storeId: oldStoreId, ...customerData } = customer;
        const newId = await CustomerRepository.add(storeId, customerData);
        const customerTxs = data.transactions.filter(t => t.customerId === id);
        for (const tx of customerTxs) {
          const { id: txId, storeId: oldTxStoreId, ...txData } = tx;
          await TransactionRepository.add(storeId, { ...txData, customerId: newId });
        }
      }
      showToast("Data restored!");
    } catch (error) {
      showToast("Failed to restore");
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to sign out?")) {
      onLogout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Settings" subtitle="Manage your business profile" />

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Business Information */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          <h3 className="font-bold text-gray-900 dark:text-white">Business Information</h3>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Store Name</label>
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-2 outline-none focus:border-green-600 mt-1 bg-transparent dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Owner Name</label>
            <input value={form.ownerName} onChange={e => setForm({...form, ownerName: e.target.value})} className="w-full text-lg border-b border-gray-200 dark:border-gray-700 pb-2 outline-none focus:border-green-600 mt-1 bg-transparent dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Email</label>
            <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full text-lg border-b border-gray-200 dark:border-gray-700 pb-2 outline-none focus:border-green-600 mt-1 bg-transparent dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Business Phone</label>
            <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full text-lg border-b border-gray-200 dark:border-gray-700 pb-2 outline-none focus:border-green-600 mt-1 bg-transparent dark:text-white" />
          </div>
          <button onClick={saveSettings} className="w-full bg-green-700 text-white font-bold py-3 rounded-xl active:scale-95 transition">
            Save Changes
          </button>
        </div>

        {/* Preferences */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
          <h3 className="font-bold text-gray-900 dark:text-white">Preferences</h3>
          
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-600 active:scale-95 transition">
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </button>

          <button onClick={requestNotifications} className="w-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-purple-200 dark:border-purple-800 active:scale-95 transition">
            <Bell size={20} /> Enable Notifications
          </button>
        </div>

        {/* Data Management */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
          <h3 className="font-bold text-gray-900 dark:text-white">Data Management</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Backup your data to a file or restore from a previous backup.</p>
          
          <button onClick={backupData} className="w-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 active:scale-95 transition">
            <Download size={20} /> Download Backup
          </button>

          <label className="w-full bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-yellow-200 dark:border-yellow-800 active:scale-95 transition cursor-pointer">
            <Upload size={20} /> Restore from Backup
            <input type="file" accept=".json" onChange={restoreData} className="hidden" />
          </label>
        </div>

        {/* LOGOUT BUTTON */}
        <button 
          onClick={handleLogout}
          className="w-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border border-red-200 dark:border-red-800 active:scale-95 transition shadow-sm"
        >
          <LogOut size={22} /> Sign Out of Store
        </button>

        {/* About */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">About CreditBook</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Version 2.0 — SaaS Edition</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Built for Ghanaian market women and small businesses. Zero-cost SMS & WhatsApp reminders.</p>
        </div>
      </div>
    </div>
  );
};