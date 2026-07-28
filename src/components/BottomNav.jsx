import { Home, Users, PlusCircle, Bell, Settings } from "lucide-react";
import useStore from "../store/useStore";

export const BottomNav = () => {
  const { view, setView, setSelectedCustomer } = useStore();

  const navigateTo = (targetView) => {
    setSelectedCustomer(null);
    setView(targetView);
  };

  const navItems = [
    { icon: Home, label: "Home", view: "home" },
    { icon: Users, label: "Customers", view: "customers" },
    { icon: PlusCircle, label: "Record", view: "record", isCenter: true },
    { icon: Bell, label: "Follow-ups", view: "followups" },
    { icon: Settings, label: "Settings", view: "settings" },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-40 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = view === item.view;
          
          // Special styling for the center "Record" button
          if (item.isCenter) {
            return (
              <button
                key={item.view}
                onClick={() => navigateTo(item.view)}
                className="relative -top-5 bg-green-700 text-white p-4 rounded-full shadow-xl border-4 border-gray-50 dark:border-gray-950 active:scale-90 transition-transform"
                aria-label="Record Sale"
              >
                <Icon size={28} />
              </button>
            );
          }

          // Standard nav items
          return (
            <button
              key={item.view}
              onClick={() => navigateTo(item.view)}
              className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                isActive 
                  ? "text-green-700 dark:text-green-400" 
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <Icon size={22} className={isActive ? "opacity-100" : "opacity-70"} />
              <span className="text-[10px] font-semibold mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};