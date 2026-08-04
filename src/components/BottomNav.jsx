import { Home, Users, Plus, Truck, Bell } from "lucide-react";
import useStore from "../store/useStore";

export const BottomNav = () => {
  const { view, setView, setSelectedCustomer, setSelectedSupplier } = useStore();

  // Helper to handle navigation and clear selections
  const handleNav = (targetView) => {
    setSelectedCustomer(null);
    setSelectedSupplier(null);
    setView(targetView);
  };

  // The center button logic: If on Suppliers, it opens Record Purchase. Otherwise, Record Sale.
  const handleAddClick = () => {
    setSelectedCustomer(null);
    setSelectedSupplier(null);
    if (view === "suppliers") {
      setView("recordPurchase");
    } else {
      setView("record");
    }
  };

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "customers", label: "Customers", icon: Users },
    { id: "suppliers", label: "Suppliers", icon: Truck },
    { id: "followups", label: "Follow-ups", icon: Bell },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto relative px-2">
        
        {/* Left Side: Home & Customers */}
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                isActive ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold mt-1">{item.label}</span>
            </button>
          );
        })}

        {/* Center: Prominent + Button */}
        <div className="relative -top-5">
          <button
            onClick={handleAddClick}
            className="w-14 h-14 bg-green-700 hover:bg-green-800 text-white rounded-full shadow-lg shadow-green-700/30 flex items-center justify-center active:scale-90 transition-transform border-4 border-gray-50 dark:border-gray-950"
            aria-label="Add New"
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
        </div>

        {/* Right Side: Suppliers & Follow-ups */}
        {navItems.slice(2, 4).map((item) => {
          const Icon = item.icon;
          // Special active state for Suppliers to use Indigo
          const isActive = view === item.id;
          const activeColor = item.id === "suppliers" ? "text-indigo-600 dark:text-indigo-400" : "text-orange-600 dark:text-orange-400";
          
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
                isActive ? activeColor : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold mt-1">{item.label}</span>
            </button>
          );
        })}

      </div>
    </div>
  );
};