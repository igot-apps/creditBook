import { Home, Users, PlusCircle, BarChart3, Settings, Bell } from "lucide-react";
import { useApp } from "../contexts/AppContext";

export const BottomNav = () => {
  const { view, setView } = useApp();
  
  const navItems = [
    { key: "home", icon: Home, label: "Home" },
    { key: "followups", icon: Bell, label: "Follow-ups" },
    { key: "record", icon: PlusCircle, label: "Record", isCenter: true },
    { key: "reports", icon: BarChart3, label: "Reports" },
    { key: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-3 flex justify-between items-center z-30 max-w-lg mx-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = view === item.key;
        
        if (item.isCenter) {
          return (
            <button 
              key={item.key}
              onClick={() => setView(item.key)} 
              className="relative -top-6 bg-green-700 text-white p-4 rounded-full shadow-lg shadow-green-700/40 active:scale-90 transition-transform"
            >
              <Icon size={32} />
            </button>
          );
        }
        
        return (
          <button 
            key={item.key}
            onClick={() => setView(item.key)} 
            className={`flex flex-col items-center gap-1 ${isActive ? "text-green-700 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}
          >
            <Icon size={24} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};