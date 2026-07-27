import { useApp } from "../contexts/AppContext";

export const Toast = () => {
  const { toast } = useApp();
  if (!toast) return null;
  
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-4 py-2 rounded-full shadow-lg z-50 text-sm font-semibold animate-fade-in">
      {toast}
    </div>
  );
};