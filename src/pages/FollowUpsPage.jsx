import { useState, useMemo } from "react";
import { MessageSquare, MessageCircle, Phone, Check, AlertCircle } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { formatCurrency } from "../utils/helpers";
import { openSMS, openWhatsApp, openDialer } from "../utils/communication";
import { PageHeader } from "../components/PageHeader";
import { CustomerService } from "../services/CustomerService";

export const FollowUpsPage = () => {
  // 👇 Changed 'store' to 'currentStore'
  const { currentStore, customers, refreshCustomers, showToast, triggerConfetti } = useApp();
  const [filter, setFilter] = useState("all");

  const followUps = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return customers
      .filter(c => c.balance > 0)
      .map(c => {
        const lastTx = c.history[c.history.length - 1];
        const lastContact = lastTx ? new Date(lastTx.date) : null;
        const daysSince = lastContact ? Math.floor((today - lastContact) / 86400000) : 999;
        
        let category = "normal";
        if (daysSince > 30) category = "overdue30";
        else if (daysSince > 7) category = "overdue7";
        else if (daysSince > 1) category = "overdue1";
        else if (!lastContact) category = "never";
        
        return { ...c, daysSince, category };
      })
      .sort((a, b) => b.balance - a.balance);
  }, [customers]);

  const filtered = useMemo(() => {
    if (filter === "all") return followUps;
    return followUps.filter(c => c.category === filter);
  }, [followUps, filter]);

  const generateMessage = (c) =>
    `Hello ${c.name}, this is a reminder from ${currentStore.name}. You have an outstanding debt of ${formatCurrency(c.balance)}. Please visit us or send payment via MoMo. Thank you!`;

  const handleMarkPaid = async (customerId) => {
    if (!currentStore) return;
    
    try {
      // 👇 Now passing both storeId and customerId
      await CustomerService.clearDebt(currentStore.id, customerId);
      await refreshCustomers();
      triggerConfetti();
      showToast("Debt cleared!");
    } catch (error) {
      console.error("Failed to clear debt:", error);
      showToast("Failed to clear debt");
    }
  };

  const filters = [
    { key: "all", label: "All", count: followUps.length },
    { key: "overdue30", label: "30+ Days", count: followUps.filter(c => c.category === "overdue30").length },
    { key: "overdue7", label: "7+ Days", count: followUps.filter(c => c.category === "overdue7").length },
    { key: "never", label: "Never Contacted", count: followUps.filter(c => c.category === "never").length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Today's Follow-ups" subtitle={`${followUps.length} customers to contact`} />

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                filter === f.key 
                  ? "bg-green-700 text-white" 
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Customer list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <Check className="mx-auto text-green-500 mb-2" size={48} />
              <p className="text-gray-700 dark:text-gray-300 font-bold text-lg">All caught up!</p>
              <p className="text-gray-500 dark:text-gray-400 mt-1">No follow-ups needed.</p>
            </div>
          ) : (
            filtered.map(c => (
              <div key={c.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{c.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{c.phone}</p>
                    {c.daysSince > 7 && (
                      <span className="inline-block mt-1 text-xs bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 px-2 py-0.5 rounded-full font-bold">
                        <AlertCircle size={10} className="inline" /> {c.daysSince} days since contact
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(c.balance)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openSMS(c.phone, generateMessage(c))}
                    className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <MessageSquare size={18} /> SMS
                  </button>
                  <button
                    onClick={() => openWhatsApp(c.phone, generateMessage(c))}
                    className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <MessageCircle size={18} /> WhatsApp
                  </button>
                  <button
                    onClick={() => openDialer(c.phone)}
                    className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <Phone size={18} /> Call
                  </button>
                  <button
                    onClick={() => handleMarkPaid(c.id)}
                    className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <Check size={18} /> Mark Paid
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};