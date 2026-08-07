import { useEffect, useState } from "react";
import { Users, Truck, Plus, FileText } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { SupplierService } from "../services/SupplierService";
import { TopBar } from "../components/TopBar";

export const HomePage = () => {
  const { currentStore, setView } = useStore();
  const [stats, setStats] = useState({
    totalReceivables: 0,
    totalPayables: 0,
    customerCount: 0,
    supplierCount: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      if (!currentStore?.id) return;
      
      try {
        const customers = await CustomerService.getAll(currentStore.id, 'customer');
        const suppliers = await SupplierService.getAll(currentStore.id, 'supplier');
        
        const totalReceivables = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
        const totalPayables = suppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);
        
        setStats({
          totalReceivables,
          totalPayables,
          customerCount: customers.length,
          supplierCount: suppliers.length
        });
      } catch (error) {
        console.error("Failed to load stats:", error);
      }
    };
    
    loadStats();
  }, [currentStore?.id]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Dashboard" />
      
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        
        {/* Financial Overview */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Financial Overview</h2>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Customers Owe Me */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
              <div className="flex items-center gap-1.5 mb-2">
                <Users size={16} className="text-green-600 dark:text-green-400" />
                <p className="text-[10px] font-bold text-green-800 dark:text-green-300 uppercase leading-tight">CUSTOMERS OWE ME</p>
              </div>
              <p className="text-lg font-bold text-green-700 dark:text-green-400 break-words leading-tight">
                {formatCurrency(stats.totalReceivables, currentStore?.currency || "GH₵")}
              </p>
            </div>

            {/* I Owe Suppliers */}
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
              <div className="flex items-center gap-1.5 mb-2">
                <Truck size={16} className="text-orange-600 dark:text-orange-400" />
                <p className="text-[10px] font-bold text-orange-800 dark:text-orange-300 uppercase leading-tight">I OWE SUPPLIERS</p>
              </div>
              <p className="text-lg font-bold text-orange-700 dark:text-orange-400 break-words leading-tight">
                {formatCurrency(stats.totalPayables, currentStore?.currency || "GH₵")}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setView('customers')}
            className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-2 active:scale-95 transition"
          >
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
              <Users size={24} />
            </div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Customers</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stats.customerCount}</p>
          </button>

          <button 
            onClick={() => setView('suppliers')}
            className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-2 active:scale-95 transition"
          >
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
              <Truck size={24} />
            </div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Suppliers</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{stats.supplierCount}</p>
          </button>
        </div>

        {/* Main Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setView('record')}
            className="bg-green-600 hover:bg-green-700 text-white p-5 rounded-2xl shadow-md flex flex-col items-center gap-2 active:scale-95 transition"
          >
            <Plus size={28} />
            <span className="font-bold text-base">Record Sale</span>
          </button>

          <button 
            onClick={() => setView('recordSupplierPurchase')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-5 rounded-2xl shadow-md flex flex-col items-center gap-2 active:scale-95 transition"
          >
            <FileText size={28} />
            <span className="font-bold text-base">Record Purchase</span>
          </button>
        </div>

      </div>
    </div>
  );
};