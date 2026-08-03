import { ArrowLeft, Menu } from "lucide-react";
import useStore from "../store/useStore";

export const TopBar = ({ title, showBack = false, onBack }) => {
  const { setIsMenuOpen, setView } = useStore();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      setView("home");
    }
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between px-4 h-14">
        {/* Left Side: Back Button or Empty Space */}
        <div className="w-10 flex items-center">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft size={22} />
            </button>
          )}
        </div>

        {/* Center: Title */}
        <h1 className="flex-1 text-center text-lg font-bold text-gray-900 dark:text-white truncate px-2">
          {title}
        </h1>

        {/* Right Side: Menu Button */}
        <div className="w-10 flex items-center justify-end">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -mr-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition active:scale-95"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>
    </div>
  );
};