import { Home, Users, PlusCircle, BarChart3, Settings, Bell } from "lucide-react";
import { useApp } from "../contexts/AppContext";

export const BottomNav = () => {
  const { view, setView, setSelectedCustomer } = useApp();
  
  const navItems = [
    { key: "home", icon: Home, label: "Home" },
    { key: "followups", icon: Bell, label: "Follow-ups" },
    { key: "record", icon: PlusCircle, label: "Record", isCenter: true },
    { key: "reports", icon: BarChart3, label: "Reports" },
    { key: "settings", icon: Settings, label: "Settings" },
  ];

  const navigateTo = (targetView) => {
    setSelectedCustomer(null);
    setView(targetView);
  };

  return (
    // 👇 Outer container: Spans the screen on mobile, but starts AFTER the sidebar on desktop (lg:left-72)
    <div className="fixed bottom-0 left-0 right-0 lg:left-72 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      
      {/*  Inner container: Keeps the buttons neatly centered within the main content area */}
      <div className="max-w-4xl mx-auto px-6 py-3 flex justify-between items-center w-full">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = view === item.key;
          
          if (item.isCenter) {
            return (
              <button 
                key={item.key}
                onClick={() => navigateTo(item.key)} 
                className="relative -top-6 bg-green-700 text-white p-4 rounded-full shadow-lg shadow-green-700/40 active:scale-90 transition-transform"
              >
                <Icon size={32} />
              </button>
            );
          }
          
          return (
            <button 
              key={item.key}
              onClick={() => navigateTo(item.key)} 
              className={`flex flex-col items-center gap-1 ${isActive ? "text-green-700 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}`}
            >
              <Icon size={24} />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};