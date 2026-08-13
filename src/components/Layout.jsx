import {
  Home, Users, Truck, Package, BarChart3, Settings,
  Moon, Sun, X, ChevronRight, Database, HelpCircle, User, Mail
} from "lucide-react";
import useStore from "../store/useStore";

// Helper Component for Menu Items (defined outside to avoid remounting)
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

  // Handle both snake_case (Supabase) and camelCase
  const ownerName = currentStore?.owner_name || currentStore?.ownerName;
  const storeEmail = currentStore?.email;

  const navigateTo = (targetView) => {
    setSelectedCustomer(null);
    if (view === targetView) {
      refreshPage();
    } else {
      setView(targetView);
    }
    setIsMenuOpen(false);
    // Since the document scrolls natively now, jump to top on navigation
    window.scrollTo({ top: 0 });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* 1. HEADER: Business Info */}
      <div className="bg-white dark:bg-gray-900 p-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
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
            className="lg:hidden p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition ml-2"
          >
            <X size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        {/* Business Info Section (Clean & Compact) */}
        <div className="space-y-2">
          {ownerName && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <User size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span className="truncate">{ownerName}</span>
            </div>
          )}
          {storeEmail && (
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Mail size={14} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              <span className="truncate">{storeEmail}</span>
            </div>
          )}
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
          </div>
        </div>
        {/* SYSTEM */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">System</p>
          <div className="space-y-1">
            <MenuItem icon={Database} label="Backup & Restore" onClick={() => { setIsMenuOpen(false); alert("Coming soon!"); }} badge="Soon" />
            <MenuItem icon={Settings} label="Settings" active={view === 'settings'} onClick={() => navigateTo('settings')} />
            <MenuItem icon={HelpCircle} label="Help & About" onClick={() => { setIsMenuOpen(false); alert("CreditBook v3.0\n\nCloud-synced with Supabase.\nYour business data is safe online!"); }} />
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-72 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 fixed inset-y-0 left-0 z-40"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }}
      >
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

      {/* 👇 MAIN CONTENT — NO nested scroll container!
          The document scrolls natively, guaranteeing smooth 1-finger scrolling on Android. */}
      <main className="flex-1 lg:ml-72 w-full max-w-full">
        {children}
      </main>
    </div>
  );
};