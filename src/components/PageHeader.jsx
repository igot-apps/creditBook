import { ArrowLeft } from "lucide-react";
import useStore from "../store/useStore";

export const PageHeader = ({ title, subtitle, onBack }) => {
  const { setView } = useStore();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setView("home");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
      <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
        <button 
          onClick={handleBack}
          className="p-2 -ml-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition active:scale-95"
        >
          <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};