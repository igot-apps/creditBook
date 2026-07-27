import { X, Home, Users, Bell, BarChart3, Settings, LogOut, Moon, Sun, Store, User, Mail, Info } from "lucide-react";
import { useApp } from "../contexts/AppContext";

export const HamburgerMenu = () => {
  const { 
    isMenuOpen, 
    setIsMenuOpen, 
    currentStore, 
    setView, 
    theme, 
    setTheme, 
    handleLogout,
    setSelectedCustomer
  } = useApp();

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const navigateTo = (view) => {
    setSelectedCustomer(null);
    setView(view);
    closeMenu();
  };

  const handleLogoutClick = () => {
    closeMenu();
    if (window.confirm("Are you sure you want to sign out?")) {
      handleLogout();
    }
  };

  const menuItems = [
    { icon: Home, label: "Home", view: "home" },
    { icon: Users, label: "Customers", view: "customers" },
    { icon: Bell, label: "Follow-ups", view: "followups" },
    { icon: BarChart3, label: "Reports", view: "reports" },
    { icon: Settings, label: "Settings", view: "settings" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMenu}
      />

      {/* Drawer */}
      <div 
        className={`fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white dark:bg-gray-900 z-50 shadow-2xl transform transition-transform duration-300 ease-out ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header with Store Info */}
        <div className="bg-gradient-to-br from-green-700 to-green-900 text-white p-6 relative">
          <button 
            onClick={closeMenu}
            className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 active:scale-95 transition"
          >
            <X size={20} />
          </button>
          
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
        <div className="p-4 space-y-1 overflow-y-auto h-full pb-32">
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase px-3 mb-2">Navigation</p>
          
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                onClick={() => navigateTo(item.view)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.98] transition-all text-left"
              >
                <Icon size={20} className="text-gray-500 dark:text-gray-400" />
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
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.98] transition-all text-left"
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

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-4" />

          {/* About */}
          <button
            onClick={() => {
              alert("CreditBook SaaS v2.0\n\nBuilt for Ghanaian market women and small businesses.\n\nZero-cost SMS & WhatsApp reminders.\nOffline-first with IndexedDB.");
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.98] transition-all text-left"
          >
            <Info size={20} className="text-gray-500 dark:text-gray-400" />
            <span className="font-medium">About CreditBook</span>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-[0.98] transition-all text-left mt-4"
          >
            <LogOut size={20} />
            <span className="font-bold">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};