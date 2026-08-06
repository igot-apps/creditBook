import { Home, Users, Truck, Settings } from "lucide-react";
import useStore from "../store/useStore";

export const BottomNav = () => {
  const { view, setView, setIsMenuOpen } = useStore();

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "customers", label: "Customers", icon: Users },
    { id: "suppliers", label: "Suppliers", icon: Truck },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-72 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] font-bold ${isActive ? "font-extrabold" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};