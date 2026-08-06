import { useState, useEffect } from "react";
import { Users, Truck, Plus, FileText } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { TopBar } from "../components/TopBar";

export const HomePage = () => {
  const { currentStore, customers, suppliers, setView } = useStore();
  const currency = currentStore?.currency || "GH₵";

  // Safely calculate totals without relying on .history
  const totalReceivable = (customers || []).reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
  const totalPayable = (suppliers || []).reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Dashboard" />
      
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        
        {/* Financial Overview */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Financial Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-900/30">
              <div className="flex items-center gap-2 mb-2">
                <Users size={18} className="text-green-600 dark:text-green-400" />
                <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase">People Owe Me</span>
              </div>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(totalReceivable, currency)}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
              <div className="flex items-center gap-2 mb-2">
                <Truck size={18} className="text-orange-600 dark:text-orange-400" />
                <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase">I Owe Suppliers</span>
              </div>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{formatCurrency(totalPayable, currency)}</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setView("customers")} 
            className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-2 active:scale-95 transition"
          >
            <Users size={24} className="text-green-600" />
            <span className="font-bold text-gray-900 dark:text-white">Customers</span>
          </button>
          <button 
            onClick={() => setView("suppliers")} 
            className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-2 active:scale-95 transition"
          >
            <Truck size={24} className="text-indigo-600" />
            <span className="font-bold text-gray-900 dark:text-white">Suppliers</span>
          </button>
          <button 
            onClick={() => setView("record")} 
            className="bg-green-600 p-4 rounded-2xl shadow-md flex flex-col items-center gap-2 active:scale-95 transition"
          >
            <Plus size={24} className="text-white" />
            <span className="font-bold text-white">Record Sale</span>
          </button>
          <button 
            onClick={() => setView("recordSupplierPurchase")} 
            className="bg-indigo-600 p-4 rounded-2xl shadow-md flex flex-col items-center gap-2 active:scale-95 transition"
          >
            <FileText size={24} className="text-white" />
            <span className="font-bold text-white">Record Purchase</span>
          </button>
        </div>
      </div>
    </div>
  );
};