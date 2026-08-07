import { Package, BarChart3, Download, Database, Settings, HelpCircle, FileText, ChevronRight } from "lucide-react";
import useStore from "../store/useStore";
import { TopBar } from "../components/TopBar";

export const MorePage = () => {
  const { setView, showToast, currentStore } = useStore();

  const menuGroups = [
    {
      title: "Catalog & Reports",
      items: [
        { 
          label: "Products", 
          description: "Manage inventory & visibility", 
          icon: Package, 
          color: "text-indigo-600 dark:text-indigo-400", 
          bg: "bg-indigo-50 dark:bg-indigo-900/20",
          action: () => setView("products") 
        },
        { 
          label: "Reports", 
          description: "Sales & profit analytics", 
          icon: BarChart3, 
          color: "text-blue-600 dark:text-blue-400", 
          bg: "bg-blue-50 dark:bg-blue-900/20",
          action: () => setView("reports") 
        },
        { 
          label: "Saved Drafts", 
          description: "Unfinished sales & purchases", 
          icon: FileText, 
          color: "text-gray-600 dark:text-gray-400", 
          bg: "bg-gray-100 dark:bg-gray-800",
          action: () => showToast("Drafts view coming soon") 
        },
      ]
    },
    {
      title: "Data Management",
      items: [
        { 
          label: "Export Data", 
          description: "Download CSV or PDF", 
          icon: Download, 
          color: "text-green-600 dark:text-green-400", 
          bg: "bg-green-50 dark:bg-green-900/20",
          action: () => showToast("Export feature coming soon") 
        },
        { 
          label: "Backup & Restore", 
          description: "Secure your business data", 
          icon: Database, 
          color: "text-orange-600 dark:text-orange-400", 
          bg: "bg-orange-50 dark:bg-orange-900/20",
          action: () => showToast("Backup feature coming soon") 
        },
      ]
    },
    {
      title: "App Settings",
      items: [
        { 
          label: "Store Settings", 
          description: "Name, currency, and details", 
          icon: Settings, 
          color: "text-gray-600 dark:text-gray-400", 
          bg: "bg-gray-100 dark:bg-gray-800",
          action: () => setView("settings") 
        },
        { 
          label: "Help & Support", 
          description: "Guides and contact info", 
          icon: HelpCircle, 
          color: "text-purple-600 dark:text-purple-400", 
          bg: "bg-purple-50 dark:bg-purple-900/20",
          action: () => showToast("Help center coming soon") 
        },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="More" />
      
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-6">
        
        {/* Store Info Header */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-xl">
            {currentStore?.name?.charAt(0) || "S"}
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white">{currentStore?.name || "My Business"}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{currentStore?.currency || "GH₵"} • Active</p>
          </div>
        </div>

        {/* Menu Groups */}
        {menuGroups.map((group, index) => (
          <div key={index}>
            <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1">
              {group.title}
            </h3>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
              {group.items.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 p-3.5 active:bg-gray-50 dark:active:bg-gray-700/50 transition text-left"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                      <Icon size={18} className={item.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{item.description}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Version Footer */}
        <p className="text-center text-[10px] text-gray-400 dark:text-gray-600 pt-4">
          CreditBook V1 • Built for speed
        </p>
      </div>
    </div>
  );
};