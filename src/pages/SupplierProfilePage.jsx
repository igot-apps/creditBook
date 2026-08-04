import { useState, useMemo } from "react";
import { Phone, MessageSquare, MessageCircle, Edit3, Archive, Truck, CreditCard, Ban, Clock, FileText, AlertTriangle, Check } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { openSMS, openWhatsApp, openDialer } from "../utils/communication";
import { SupplierService } from "../services/SupplierService";
import { TopBar } from "../components/TopBar";

export const SupplierProfilePage = () => {
  const { currentStore, selectedSupplier, setSelectedSupplier, setView, setPrefillTransaction, showToast, triggerConfetti } = useStore();
  
  const currency = currentStore?.currency || "GH";

  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [txToCancel, setTxToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [supplierData, setSupplierData] = useState(selectedSupplier);

  if (!supplierData) return null;

  const history = supplierData.history || [];
  const totalPurchases = history.reduce((sum, t) => sum + (t.amount > 0 && !t.isVoid ? t.amount : 0), 0);
  const totalPayments = history.reduce((sum, t) => sum + (t.paid > 0 && !t.isVoid ? t.paid : 0), 0);

  const generateMessage = (s) => 
    `Hello ${s.name}, this is ${currentStore?.name || "Store"}. I will send your ${formatCurrency(s.balance, currency)} by the end of the week. Thank you!`;

  const handleRecordPurchase = () => {
    setPrefillTransaction({ 
      supplierId: supplierData.id, 
      name: supplierData.name, 
      phone: supplierData.phone, 
      items: "", 
      amount: "", 
      paid: "0" 
    });
    setView("recordPurchase");
  };

  const handleMakePayment = () => {
    setPrefillTransaction({ 
      supplierId: supplierData.id, 
      name: supplierData.name, 
      phone: supplierData.phone, 
      items: "Payment", 
      amount: "0", 
      paid: "" 
    });
    setView("recordPurchase");
  };

  const handleClearBalance = async () => {
    if (supplierData.balance <= 0) return;
    try {
      await SupplierService.clearDebt(currentStore.id, supplierData.id);
      const updated = await SupplierService.getAll(currentStore.id);
      const freshData = updated.find(s => s.id === supplierData.id);
      setSupplierData(freshData);
      triggerConfetti();
      showToast("✅ Balance cleared!");
    } catch (error) {
      showToast("❌ Failed to clear balance.");
    }
  };

  const handleCancelTransaction = (tx) => {
    setTxToCancel(tx);
    setCancelReason("");
    setShowCancelModal(true);
  };

  const executeCancelTransaction = async () => {
    if (!cancelReason.trim()) {
      showToast("⚠️ Please provide a reason for cancellation.");
      return;
    }
    setShowCancelModal(false);
    try {
      await SupplierService.voidTransaction(currentStore.id, supplierData.id, txToCancel.id, cancelReason);
      const updated = await SupplierService.getAll(currentStore.id);
      const freshData = updated.find(s => s.id === supplierData.id);
      setSupplierData(freshData);
      showToast("✅ Purchase cancelled successfully!");
    } catch (error) {
      showToast("❌ Failed to cancel purchase.");
    }
    setTxToCancel(null);
    setCancelReason("");
  };

  const handleArchive = async () => {
    setShowArchiveModal(false);
    // For now, we just navigate back. Full archive logic can be added to SupplierService later.
    showToast("Supplier archived.");
    setView("suppliers");
    setSelectedSupplier(null);
  };

  const getTimelineIcon = (tx) => {
    if (tx.isVoid) return <Ban size={16} className="text-gray-500" />;
    if (tx.amount > 0 && tx.paid === 0) return <Truck size={16} className="text-orange-500" />;
    if (tx.amount === 0 && tx.paid > 0) return <CreditCard size={16} className="text-green-500" />;
    return <Truck size={16} className="text-indigo-500" />;
  };

  const getTimelineColor = (tx) => {
    if (tx.isVoid) return "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 opacity-70";
    if (tx.amount > 0 && tx.paid === 0) return "border-orange-200 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10";
    if (tx.amount === 0 && tx.paid > 0) return "border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10";
    return "border-indigo-200 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      {/* 👇 FIXED TOP BAR - Explicit Title */}
      <TopBar title="Supplier Profile" showBack={true} onBack={() => { setView("suppliers"); setSelectedSupplier(null); }} />
      
      {/* 👇 MAIN CONTENT */}
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        
        {/* Supplier Summary Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm text-center border border-gray-100 dark:border-gray-700">
          <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold">
            {supplierData.name.charAt(0)}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{supplierData.name}</h3>
          <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 mt-1">
            <Phone size={14} /> {supplierData.phone}
          </p>
          
          <div className={`mt-4 text-4xl font-bold ${supplierData.balance > 0 ? "text-orange-600 dark:text-orange-400" : supplierData.balance < 0 ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"}`}>
            {supplierData.balance < 0 ? `Credit: ${formatCurrency(Math.abs(supplierData.balance), currency)}` : formatCurrency(supplierData.balance, currency)}
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {supplierData.balance > 0 ? "Amount I Owe" : supplierData.balance < 0 ? "Overpaid (Credit)" : "All Paid Up"}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 uppercase font-bold">Total Purchases</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalPurchases, currency)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 uppercase font-bold">Total Paid</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPayments, currency)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 uppercase font-bold">Total Transactions</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{history.filter(t => !t.isVoid).length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 uppercase font-bold">Supplier Since</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
              {supplierData.createdAt ? formatDate(supplierData.createdAt).split(',')[0] : 'N/A'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-2">
          <button onClick={handleRecordPurchase} className="bg-indigo-600 text-white p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition shadow-md">
            <Truck size={20} /> <span className="text-[10px] font-bold">Purchase</span>
          </button>
          <button onClick={handleMakePayment} className="bg-green-600 text-white p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition shadow-md">
            <CreditCard size={20} /> <span className="text-[10px] font-bold">Payment</span>
          </button>
          <button onClick={() => openWhatsApp(supplierData.phone, generateMessage(supplierData))} className="bg-green-500 text-white p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition shadow-md">
            <MessageCircle size={20} /> <span className="text-[10px] font-bold">WhatsApp</span>
          </button>
          <button onClick={() => openSMS(supplierData.phone, generateMessage(supplierData))} className="bg-blue-500 text-white p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition shadow-md">
            <MessageSquare size={20} /> <span className="text-[10px] font-bold">SMS</span>
          </button>
          <button onClick={() => openDialer(supplierData.phone)} className="col-span-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
            <Phone size={18} /> <span className="text-xs font-bold">Call Supplier</span>
          </button>
          <button onClick={() => showToast("Edit feature coming soon")} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition">
            <Edit3 size={18} /> <span className="text-[10px] font-bold">Edit</span>
          </button>
          <button onClick={() => setShowArchiveModal(true)} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition">
            <Archive size={18} /> <span className="text-[10px] font-bold">Archive</span>
          </button>
        </div>

        {/* Purchase History Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Clock size={18} /> Purchase History
          </div>
          <div className="p-4 space-y-0">
            {history.length === 0 ? (
              <p className="text-center text-gray-400 py-6">No purchase history yet</p>
            ) : (
              [...history].reverse().map((tx, index) => (
                <div key={tx.id} className="relative pl-8 pb-6 last:pb-0">
                  {index !== history.length - 1 && (
                    <div className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${tx.isVoid ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                  )}
                  <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border-2 flex items-center justify-center z-10 ${tx.isVoid ? 'border-red-300 dark:border-red-800' : 'border-gray-200 dark:border-gray-600'}`}>
                    {tx.isVoid ? <Ban size={14} className="text-red-500" /> : getTimelineIcon(tx)}
                  </div>
                  <div className={`p-3 rounded-xl border transition-all ${tx.isVoid ? 'border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/5 opacity-80' : getTimelineColor(tx)}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm flex items-center flex-wrap gap-2 ${tx.isVoid ? 'text-gray-500 line-through decoration-red-500 decoration-2' : 'text-gray-900 dark:text-white'}`}>
                          {tx.items || "General Purchase"} 
                          {tx.isVoid && <span className="text-[10px] text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded font-bold no-underline tracking-wider">CANCELLED</span>}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2 mt-0.5">{formatDate(tx.date)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-2">
                      <div className="space-y-0.5">
                        {tx.amount > 0 && <p className={`text-gray-600 dark:text-gray-300 ${tx.isVoid ? 'line-through' : ''}`}>Purchase: <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(tx.amount, currency)}</span></p>}
                        {tx.paid > 0 && <p className={`text-green-600 dark:text-green-400 ${tx.isVoid ? 'line-through' : ''}`}>Paid: <span className="font-bold">{formatCurrency(tx.paid, currency)}</span></p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setViewingTransaction(tx)} className="p-1.5 bg-white dark:bg-gray-700 rounded-lg text-gray-500 hover:text-indigo-600 transition shadow-sm" title="View Details">
                          <FileText size={14} />
                        </button>
                        {!tx.isVoid && (
                          <button onClick={() => handleCancelTransaction(tx)} className="p-1.5 bg-white dark:bg-gray-700 rounded-lg text-gray-500 hover:text-red-600 transition shadow-sm" title="Cancel Purchase">
                            <Ban size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Display Cancellation Reason */}
                    {tx.isVoid && tx.voidReason && (
                      <div className="mt-3 pt-3 border-t border-dashed border-red-200 dark:border-red-800">
                        <p className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 mb-1">
                          <Ban size={10} /> Reason for Cancellation
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 italic bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                          {tx.voidReason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Cancel Purchase Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Cancel Purchase</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              You are about to cancel this purchase for <span className="font-bold text-red-600">{formatCurrency(txToCancel?.amount, currency)}</span>.
            </p>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Reason for Cancellation *</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Goods returned, wrong items delivered..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 dark:text-white mb-4 text-sm"
              rows="3"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Cancel</button>
              <button
                onClick={executeCancelTransaction}
                disabled={!cancelReason.trim()}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
              >
                Cancel Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Archive Supplier?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">This will hide <span className="font-bold text-indigo-600">{supplierData.name}</span> from your active list. Old purchase history will remain intact.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowArchiveModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Cancel</button>
              <button onClick={handleArchive} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl">Archive</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};