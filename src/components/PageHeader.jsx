import { X, ChevronRight } from "lucide-react";
import { useApp } from "../contexts/AppContext";

export const PageHeader = ({ title, subtitle, onBack, backTo = "home" }) => {
  const { setView, setSelectedCustomer } = useApp();
  
  const handleBack = () => {
    if (onBack) onBack();
    else {
      setView(backTo);
      if (backTo === "home") setSelectedCustomer(null);
    }
  };

  return (
    <div className="bg-green-700 dark:bg-gray-900 text-white p-4 flex items-center gap-3 sticky top-0 z-20 shadow-md">
      <button onClick={handleBack} className="p-2 bg-white/20 rounded-full active:scale-95 transition">
        {onBack || backTo !== "home" ? <X size={20} /> : <ChevronRight className="rotate-180" size={20} />}
      </button>
      <div className="flex-1">
        <h2 className="text-xl font-bold">{title}</h2>
        {subtitle && <p className="text-green-100 text-sm">{subtitle}</p>}
      </div>
    </div>
  );
};