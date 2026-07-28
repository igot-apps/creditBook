import { Home, Users, Package, Bell, BarChart3, Settings, Moon, Sun, User, Mail, Info, Menu, X } from "lucide-react";
import useStore from "../store/useStore";
import { useState } from "react";

export const Layout = ({ children }) => {
  const { 
    currentStore, 
    setView, 
    view,
    theme, 
    setTheme, 
    setSelectedCustomer
  } = useStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigateTo = (targetView) => {
    setSelectedCustomer(null);
    setView(targetView);
    setIsMobileMenuOpen(false);
  };

  // 👇 FIXED: Removed all trailing spaces from view strings
  const menuItems = [
    { icon: Home, label: "Home", view: "home" },
    { icon: Users, label: "Customers", view: "customers" },
    { icon: Package, label: "Products", view: "products" },
    { icon: Bell, label: "Follow-ups", view: "followups" },
    { icon: BarChart3, label: "Reports", view: "reports" },
    { icon: Settings, label: "Settings", view: "settings" },
  ];

  // 👇 FIXED: Removed the syntax error space in "() =>"
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header with Store Info */}
      <div className="bg-gradient-to-br from-green-700 to-green-900 text-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
            {currentStore?.name?.charAt(0) || "S"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg truncate">{currentStore?.name || "Store"}</p>
            <p className="text-green-100 text-sm truncate">Welcome back!</p>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2 text-green-100">
            <User size={14} />
            <span className="truncate">{currentStore?.ownerName || "Owner"}</span>
          </div>
          <div className="flex items-center gap-2 text-green-100">
            <Mail size={14} />
            <span className="truncate">{currentStore?.email || "email@store.com"}</span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase px-3 mb-2">Navigation</p>
        
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.view;
          return (
            <button
              key={item.view}
              onClick={() => navigateTo(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left ${
                isActive 
                  ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-bold" 
                  : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-4" />

        {/* Theme Toggle */}
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase px-3 mb-2">Preferences</p>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-left"
        >
          {theme === "dark" ? (
            <>
              <Sun size={20} className="text-yellow-500" />
              <span className="font-medium">Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={20} className="text-gray-500" />
              <span className="font-medium">Dark Mode</span>
            </>
          )}
        </button>

        {/* About */}
        <button
          onClick={() => {
            alert("CreditBook v2.0\n\nBuilt for small businesses.\n\nOffline-first with IndexedDB.\nNo login required!");
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-left"
        >
          <Info size={20} className="text-gray-500 dark:text-gray-400" />
          <span className="font-medium">About CreditBook</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Desktop Sidebar - Always Visible */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 fixed h-screen">
        <SidebarContent />
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700"
        aria-label="Open menu"
      >
        <Menu size={24} className="text-gray-700 dark:text-gray-200" />
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="lg:hidden fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-900 z-50 shadow-2xl">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full"
            >
              <X size={20} className="text-gray-700 dark:text-gray-200" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Main Content - FIXED with overflow prevention */}
      <main className="flex-1 lg:ml-72 w-full max-w-full overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};