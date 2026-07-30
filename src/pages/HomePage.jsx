import { useState, useMemo } from "react";
import { Search, Users, TrendingUp, PlusCircle, FileText, ChevronDown } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { CustomerCard } from "../components/CustomerCard";
import { Confetti } from "../components/Confetti";
import { ConfirmModal } from "../components/ConfirmModal"; // 👈 Import the new modal

export const HomePage = () => {
  const { currentStore, customers, setView, setPrefillTransaction, drafts, deleteDraft } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDrafts, setShowDrafts] = useState(false);
  
  // 👇 State for the reusable modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [discardTargetId, setDiscardTargetId] = useState(null);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, searchQuery]);

  const totalDebt = useMemo(() => customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0), [customers]);
  const todaySales = useMemo(() => {
    if (!currentStore) return 0;
    const today = new Date().toDateString();
    return customers.reduce((sum, c) => sum + (c.history || []).filter(h => new Date(h.date).toDateString() === today && !h.isVoid).reduce((s, h) => s + (h.amount || 0), 0), 0);
  }, [customers, currentStore]);

  const handleCreateFromSearch = () => {
    const q = searchQuery.trim();
    const isPhone = /^\d+$/.test(q.replace(/\s/g, ''));
    setPrefillTransaction({ customerId: null, name: isPhone ? "" : q, phone: isPhone ? q : "", items: "", amount: "", paid: "" });
    setView("record");
    setSearchQuery("");
  };

  const handleResumeDraft = (draft) => {
    setPrefillTransaction({ ...draft, isDraft: true, customerId: draft.customerId, name: draft.name, phone: draft.phone, items: draft.items, amount: draft.amount, paid: draft.paid, note: draft.note || "", invoiceItems: draft.invoiceItems });
    setView("record");
  };

  const openDiscardModal = (draftId) => {
    setDiscardTargetId(draftId);
    setIsConfirmOpen(true);
  };

  const executeDiscard = async () => {
    if (discardTargetId) {
      await deleteDraft(discardTargetId);
      setDiscardTargetId(null);
    }
  };

  if (!currentStore) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-700 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Loading your business data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <Confetti />
      
      <div className="bg-green-700 dark:bg-gray-900 text-white p-6 pb-8 rounded-b-[2rem] shadow-lg relative">
        <div className="flex justify-between items-start mb-6">
          <div>
            <p className="text-green-100 dark:text-gray-400 text-sm font-medium">{currentStore.name}</p>
            <h1 className="text-2xl font-bold">Good Day, {currentStore.ownerName || "Owner"}!</h1>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <p className="text-green-100 text-sm">Total Outstanding Debt</p>
          <p className="text-4xl font-bold mt-1">{formatCurrency(totalDebt)}</p>
        </div>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={16} className="text-green-600" /><p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">Today's Sales</p></div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(todaySales)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase mb-1">Customers Owing</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">{customers.filter(c => c.balance > 0).length}</p>
          </div>
        </div>

        {drafts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <button onClick={() => setShowDrafts(!showDrafts)} className="w-full flex items-center justify-between p-4 active:bg-gray-50 dark:active:bg-gray-700 transition">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full flex items-center justify-center flex-shrink-0"><FileText size={20} /></div>
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">Pending Drafts</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{drafts.length} unfinished {drafts.length === 1 ? 'invoice' : 'invoices'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 text-xs font-bold px-3 py-1.5 rounded-full">{drafts.length}</span>
                <ChevronDown size={20} className={`text-gray-400 transition-transform duration-200 ${showDrafts ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showDrafts && (
              <div className="border-t border-gray-100 dark:border-gray-700 p-3 space-y-2 bg-gray-50 dark:bg-gray-900/50 max-h-60 overflow-y-auto">
                {drafts.map(draft => (
                  <div key={draft.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <button onClick={() => handleResumeDraft(draft)} className="w-full text-left">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{draft.name || "Walk-in Customer"}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{draft.recordMode === 'detailed' && draft.invoiceItems ? `${draft.invoiceItems.length} items` : (draft.items || "Quick Note")}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{formatDate(draft.createdAt)}</p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(parseFloat(draft.amount) || 0)}</p>
                          <p className="text-[10px] text-green-600 dark:text-green-400 font-semibold">Tap to resume</p>
                        </div>
                      </div>
                    </button>
                    <button onClick={() => openDiscardModal(draft.id)} className="text-xs text-red-600 dark:text-red-400 hover:underline mt-2 font-semibold">Discard draft</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Customers</h2>
            <button onClick={() => setView("customers")} className="text-green-700 dark:text-green-400 text-sm font-semibold">View All</button>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search name or phone..." className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-green-500 shadow-sm" />
            {searchQuery.trim() && filteredCustomers.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-xl shadow-lg z-20 overflow-hidden">
                <button onClick={handleCreateFromSearch} className="w-full flex items-center gap-3 p-3 text-left hover:bg-green-50 dark:hover:bg-green-900/20 transition active:bg-green-100 dark:active:bg-green-900/30">
                  <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center flex-shrink-0"><PlusCircle size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">Create new customer</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Use "{searchQuery.trim()}"</p>
                  </div>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {(searchQuery ? filteredCustomers : customers).slice(0, 5).map(c => (<CustomerCard key={c.id} customer={c} />))}
            {customers.length === 0 && !searchQuery && (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                <Users className="mx-auto text-gray-300 mb-2" size={48} />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No customers yet</p>
                <button onClick={() => setView("record")} className="mt-3 text-green-700 dark:text-green-400 font-bold">Add your first customer</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 👇 NEW: Reusable Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={executeDiscard}
        title="Discard Draft?"
        message="This will permanently delete this unfinished invoice. This action cannot be undone."
        confirmWord="yes"
        confirmButtonText="Permanently Discard"
        isDestructive={true}
      />
    </div>
  );
};