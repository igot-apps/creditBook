import { useState, useMemo } from "react";
import { MessageSquare, MessageCircle, Phone, Check, AlertCircle } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { openSMS, openWhatsApp, openDialer } from "../utils/communication";
import { PageHeader } from "../components/PageHeader";
import { CustomerService } from "../services/CustomerService";

export const FollowUpsPage = () => {
  const { currentStore, customers, refreshCustomers, showToast, triggerConfetti } = useStore();
  const currency = currentStore?.currency || "GH₵";
  const [filter, setFilter] = useState("all");

  const followUps = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return customers.filter(c => c.balance > 0 && !c.isArchived).map(c => {
      const lastTx = c.history[c.history.length - 1];
      const lastContact = lastTx ? new Date(lastTx.date) : null;
      const daysSince = lastContact ? Math.floor((today - lastContact) / 86400000) : 999;
      let category = "normal";
      if (daysSince > 30) category = "overdue30";
      else if (daysSince > 7) category = "overdue7";
      else if (daysSince > 1) category = "overdue1";
      else if (!lastContact) category = "never";
      return { ...c, daysSince, category };
    }).sort((a, b) => b.balance - a.balance);
  }, [customers]);

  const filtered = useMemo(() => filter === "all" ? followUps : followUps.filter(c => c.category === filter), [followUps, filter]);

  const generateMessage = (c) => `Hello ${c.name}, this is a reminder from ${currentStore?.name || "Store"}. You have an outstanding debt of ${formatCurrency(c.balance, currency)}. Please visit us or send payment via MoMo. Thank you!`;

  const handleMarkPaid = async (customerId) => {
    try {
      await CustomerService.clearDebt(currentStore.id, customerId);
      await refreshCustomers(); triggerConfetti(); showToast("Balance cleared!");
    } catch (error) { showToast("Failed to clear balance"); }
  };

  const filters = [
    { key: "all", label: "All", count: followUps.length },
    { key: "overdue30", label: "30+ Days", count: followUps.filter(c => c.category === "overdue30").length },
    { key: "overdue7", label: "7+ Days", count: followUps.filter(c => c.category === "overdue7").length },
    { key: "never", label: "Never", count: followUps.filter(c => c.category === "never").length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Customers Owing" subtitle={`${followUps.length} to contact`} />
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="w-full overflow-x-auto flex gap-2 pb-2 scrollbar-hide">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition active:scale-95 ${filter === f.key ? "bg-green-700 text-white shadow-md" : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"}`}>
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <Check className="mx-auto text-green-500 mb-3" size={48} />
              <p className="text-gray-700 dark:text-gray-300 font-bold text-lg">All caught up!</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">No customers owing right now.</p>
            </div>
          ) : filtered.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 dark:text-white text-base truncate">{c.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{c.phone}</p>
                  {c.daysSince > 7 && <span className="inline-flex items-center gap-1 mt-2 text-xs bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-2 py-1 rounded-full font-bold"><AlertCircle size={12} /> {c.daysSince} days</span>}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCurrency(c.balance, currency)}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Owed</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => openSMS(c.phone, generateMessage(c))} className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition text-sm"><MessageSquare size={16} /> SMS</button>
                <button onClick={() => openWhatsApp(c.phone, generateMessage(c))} className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition text-sm"><MessageCircle size={16} /> WhatsApp</button>
                <button onClick={() => openDialer(c.phone)} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition text-sm"><Phone size={16} /> Call</button>
                <button onClick={() => handleMarkPaid(c.id)} className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition text-sm"><Check size={16} /> Payment</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};