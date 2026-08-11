import { useState } from "react";
import { Home, Users, Truck, MoreHorizontal, Package, Settings, Database, X, ChevronRight } from "lucide-react";
import useStore from "../store/useStore";

export const BottomNav = () => {
  const { view, setView, setSelectedCustomer, setSelectedSupplier } = useStore();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const navigate = (target) => {
    // Clear selections when navigating to prevent state bugs
    setSelectedCustomer(null);
    setSelectedSupplier(null);
    setView(target);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* 1. BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
          <NavItem 
            icon={Home} 
            label="Home" 
            active={view === 'home'} 
            onClick={() => navigate('home')} 
          />
          <NavItem 
            icon={Users} 
            label="Customers" 
            active={view === 'customers' || view === 'profile'} 
            onClick={() => navigate('customers')} 
          />
          <NavItem 
            icon={Truck} 
            label="Suppliers" 
            active={view === 'suppliers' || view === 'supplierProfile'} 
            onClick={() => navigate('suppliers')} 
          />
          <NavItem 
            icon={MoreHorizontal} 
            label="More" 
            active={showMoreMenu} 
            onClick={() => setShowMoreMenu(true)} 
          />
        </div>
      </nav>

      {/* 2. "MORE" BOTTOM SHEET MENU */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowMoreMenu(false)}>
          <div 
            className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Menu</h3>
              <button onClick={() => setShowMoreMenu(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Menu Options */}
            <div className="p-4 space-y-3">
              
              {/* Products */}
              <button 
                onClick={() => navigate('products')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl active:scale-[0.98] transition border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                    <Package size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 dark:text-white">Products</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Manage inventory & catalog</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>

              {/* Settings */}
              <button 
                onClick={() => navigate('settings')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl active:scale-[0.98] transition border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center">
                    <Settings size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 dark:text-white">Business Settings</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Name, currency & details</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>

              {/* Backup & Restore (The "Something Even Better") */}
              <button 
                onClick={() => { setShowMoreMenu(false); alert("Backup & Restore feature coming in the next update! This will allow you to export your database to a JSON file."); }}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl active:scale-[0.98] transition border border-gray-100 dark:border-gray-700"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
                    <Database size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 dark:text-white">Backup & Restore</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Export/Import your data</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">Soon</span>
              </button>

            </div>

            {/* Safe area padding for bottom of sheet */}
            <div className="h-4"></div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper Component for Nav Items
const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-16 h-full transition-all active:scale-90 ${
      active ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"
    }`}
  >
    <Icon size={22} strokeWidth={active ? 2.5 : 2} className={active ? "mb-1" : "mb-1"} />
    <span className={`text-[10px] font-bold ${active ? "font-bold" : "font-medium"}`}>{label}</span>
  </button>
);