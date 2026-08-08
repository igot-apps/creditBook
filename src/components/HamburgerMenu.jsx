import { useState, useEffect } from "react";
import { 
  Home, Users, Truck, Package, BarChart3, Bell, Database, 
  Moon, Sun, Settings, HelpCircle, X, TrendingUp, TrendingDown, ChevronRight
} from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { SupplierService } from "../services/SupplierService";

export const HamburgerMenu = ({ isOpen, onClose }) => {
  const { currentStore, view, setView, theme } = useStore();
  const [metrics, setMetrics] = useState({ customerDebt: 0, supplierDebt: 0 });

  useEffect(() => {
    if (isOpen && currentStore?.id) {
      Promise.all([
        CustomerService.getAll(currentStore.id),
        SupplierService.getAll(currentStore.id)
      ]).then(([customers, suppliers]) => {
        const cDebt = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
        const sDebt = suppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);
        setMetrics({ customerDebt: cDebt, supplierDebt: sDebt });
      }).catch(err => console.error("Failed to load menu metrics", err));
    }
  }, [isOpen, currentStore?.id]);

  const handleNav = (targetView) => {
    if (view === targetView) {
      onClose();
    } else {
      setView(targetView);
      onClose();
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    if (useStore.getState().setTheme) {
      useStore.getState().setTheme(newTheme);
    }
  };

  if (!isOpen) return null;

  const currency = currentStore?.currency || "GH₵";

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Slide-out Panel - Clean & Minimalist */}
      <div className="relative w-[85%] max-w-sm h-full bg-gray-50 dark:bg-gray-950 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* 1. CLEAN HEADER (Matches TopBar) */}
        <div className="bg-white dark:bg-gray-900 p-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
              {currentStore?.name || "My Store"}
            </h2>
            <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              <X size={18} className="text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Live Metrics - Styled like Home Page cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-900/30">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={12} className="text-green-600 dark:text-green-400" />
                <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase">Owed to Me</span>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {formatCurrency(metrics.customerDebt, currency)}
              </p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown size={12} className="text-orange-600 dark:text-orange-400" />
                <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase">I Owe</span>
              </div>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                {formatCurrency(metrics.supplierDebt, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* 2. SCROLLABLE NAVIGATION */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          
          {/* TODAY */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">Today</p>
            <div className="space-y-1">
              <MenuItem icon={Home} label="Dashboard" active={view === 'home'} onClick={() => handleNav('home')} />
              <MenuItem icon={Users} label="Customers" active={view === 'customers'} onClick={() => handleNav('customers')} />
              <MenuItem icon={Truck} label="Suppliers" active={view === 'suppliers'} onClick={() => handleNav('suppliers')} />
            </div>
          </div>

          {/* MANAGE */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">Manage</p>
            <div className="space-y-1">
              <MenuItem icon={Package} label="Products" active={view === 'products'} onClick={() => handleNav('products')} />
              <MenuItem icon={BarChart3} label="Reports" active={view === 'reports'} onClick={() => handleNav('reports')} />
              <MenuItem icon={Bell} label="Follow-ups" active={view === 'followups'} onClick={() => handleNav('followups')} />
            </div>
          </div>

          {/* SYSTEM */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">System</p>
            <div className="space-y-1">
              <MenuItem icon={Database} label="Backup & Restore" onClick={() => onClose()} badge="Soon" />
              <MenuItem icon={Settings} label="Settings" active={view === 'settings'} onClick={() => handleNav('settings')} />
              <MenuItem icon={HelpCircle} label="Help & About" onClick={() => onClose()} />
            </div>
          </div>
        </div>

        {/* 3. FOOTER (Theme Toggle) */}
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                {theme === "dark" ? <Moon size={16} className="text-indigo-500" /> : <Sun size={16} className="text-orange-500" />}
              </div>
              <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">
                {theme === "dark" ? "Dark Mode" : "Light Mode"}
              </span>
            </div>
            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${theme === "dark" ? "bg-indigo-600" : "bg-gray-300"}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${theme === "dark" ? "translate-x-4" : "translate-x-0"}`} />
            </div>
          </button>
        </div>

      </div>
    </div>
  );
};

// Helper Component for Menu Items - Cleaner & Lighter
const MenuItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all active:scale-[0.98] ${
      active 
        ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-100 dark:border-gray-700" 
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon size={18} strokeWidth={active ? 2.5 : 2} className={active ? "text-indigo-600 dark:text-indigo-400" : ""} />
      <span className={`font-medium text-sm ${active ? "font-bold" : ""}`}>{label}</span>
    </div>
    {badge && (
      <span className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
    {active && <ChevronRight size={14} className="text-gray-400" />}
  </button>
);