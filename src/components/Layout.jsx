import { useState, useEffect } from "react";
import { 
  Home, Users, Truck, Package, Bell, BarChart3, Settings, 
  Moon, Sun, Info, X, TrendingUp, TrendingDown, ChevronRight, Database, HelpCircle 
} from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { SupplierService } from "../services/SupplierService";

export const Layout = ({ children }) => {
  const {
    currentStore,
    setView,
    view,
    theme,
    setTheme,
    setSelectedCustomer,
    isMenuOpen,
    setIsMenuOpen,
    refreshPage
  } = useStore();

  const [metrics, setMetrics] = useState({ customerDebt: 0, supplierDebt: 0 });

  // Fetch live metrics for the sidebar card
  useEffect(() => {
    if (currentStore?.id) {
      Promise.all([
        CustomerService.getAll(currentStore.id),
        SupplierService.getAll(currentStore.id)
      ]).then(([customers, suppliers]) => {
        const cDebt = customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0);
        const sDebt = suppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0);
        setMetrics({ customerDebt: cDebt, supplierDebt: sDebt });
      }).catch(err => console.error("Failed to load sidebar metrics", err));
    }
  }, [currentStore?.id]);

  const navigateTo = (targetView) => {
    setSelectedCustomer(null);
    if (view === targetView) {
      refreshPage();
    } else {
      setView(targetView);
    }
    setIsMenuOpen(false);
  };

  const currency = currentStore?.currency || "GH₵";

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      
      {/* 1. CLEAN HEADER with Live Metrics */}
      <div className="bg-white dark:bg-gray-900 p-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0">
              {currentStore?.name?.charAt(0) || "S"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{currentStore?.name || "My Store"}</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs truncate">Command Center</p>
            </div>
          </div>
          {/* Close button for mobile only */}
          <button 
            onClick={() => setIsMenuOpen(false)} 
            className="lg:hidden p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <X size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Live Metrics - Styled exactly like Home Page cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-green-50 dark:bg-green-900/10 p-2.5 rounded-xl border border-green-100 dark:border-green-900/30">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={12} className="text-green-600 dark:text-green-400" />
              <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase">Owed to Me</span>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {formatCurrency(metrics.customerDebt, currency)}
            </p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/10 p-2.5 rounded-xl border border-orange-100 dark:border-orange-900/30">
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

      {/* 2. SCROLLABLE NAVIGATION (Grouped) */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        
        {/* TODAY */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">Today</p>
          <div className="space-y-1">
            <MenuItem icon={Home} label="Dashboard" active={view === 'home'} onClick={() => navigateTo('home')} />
            <MenuItem icon={Users} label="Customers" active={view === 'customers'} onClick={() => navigateTo('customers')} />
            <MenuItem icon={Truck} label="Suppliers" active={view === 'suppliers'} onClick={() => navigateTo('suppliers')} />
          </div>
        </div>

        {/* MANAGE */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">Manage</p>
          <div className="space-y-1">
            <MenuItem icon={Package} label="Products" active={view === 'products'} onClick={() => navigateTo('products')} />
            <MenuItem icon={BarChart3} label="Reports" active={view === 'reports'} onClick={() => navigateTo('reports')} />
            <MenuItem icon={Bell} label="Follow-ups" active={view === 'followups'} onClick={() => navigateTo('followups')} />
          </div>
        </div>

        {/* SYSTEM */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">System</p>
          <div className="space-y-1">
            <MenuItem icon={Database} label="Backup & Restore" onClick={() => { setIsMenuOpen(false); alert("Coming soon!"); }} badge="Soon" />
            <MenuItem icon={Settings} label="Settings" active={view === 'settings'} onClick={() => navigateTo('settings')} />
            <MenuItem icon={HelpCircle} label="Help & About" onClick={() => { setIsMenuOpen(false); alert("CreditBook v2.0\n\nBuilt for small businesses.\n\nOffline-first with IndexedDB.\nNo login required!"); }} />
          </div>
        </div>
      </div>

      {/* 3. FOOTER (Theme Toggle) */}
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
        <button 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
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
  );

  // Helper Component for Menu Items
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 fixed h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40" 
            onClick={() => setIsMenuOpen(false)} 
          />
          <aside className="lg:hidden fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-gray-50 dark:bg-gray-950 z-50 shadow-2xl animate-in slide-in-from-left duration-300">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-72 w-full max-w-full">
        <div 
          className="min-h-screen overflow-y-auto"
          style={{ 
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
};