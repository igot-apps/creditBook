import { useEffect, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";

export function PwaUpdatePrompt() {
  const registrationRef = useRef(null);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration || null;
      registration?.update().catch(() => {});
    },
  });

  useEffect(() => {
    const check = () => registrationRef.current?.update().catch(() => {});
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(check, 10 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, []);

  if (!needRefresh) return null;

  return (
    <aside className="fixed inset-x-3 bottom-20 z-[120] mx-auto max-w-md rounded-2xl border border-indigo-200 bg-white p-4 shadow-2xl dark:border-indigo-800 dark:bg-gray-900" role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"><RefreshCw size={20}/></div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-gray-900 dark:text-white">New CreditBook update available</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Update now to use the latest fixes and features.</p>
          <button type="button" onClick={() => updateServiceWorker(true)} className="mt-3 w-full rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white active:scale-[0.98]">Update now</button>
        </div>
        <button type="button" aria-label="Remind me later" onClick={() => setNeedRefresh(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={18}/></button>
      </div>
    </aside>
  );
}
