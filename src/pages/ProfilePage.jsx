import { useState, useEffect } from "react";
import { Phone, MessageSquare, MessageCircle, Edit3, Archive, Ban, Clock, AlertTriangle, RotateCcw, FileText, X, Check } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { openSMS, openWhatsApp, openDialer } from "../utils/communication";
import { CustomerService } from "../services/CustomerService"; // Using the bridge for now
import { TopBar } from "../components/TopBar";

export const ProfilePage = () => {
  const { currentStore, selectedCustomer, setSelectedCustomer, setView, setPrefillTransaction, showToast, triggerConfetti } = useStore();
  
  const currency = currentStore?.currency || "GH";

  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRedoModal, setShowRedoModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [customerData, setCustomerData] = useState(selectedCustomer);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (selectedCustomer?.id) {
      // Load fresh data and history using the new services
      CustomerService.getById(selectedCustomer.id).then(setCustomerData);
      CustomerService.getHistory(selectedCustomer.id).then(setHistory);
    }
  }, [selectedCustomer?.id]);

  if (!customerData) return null;

  const totalSales = history.reduce((sum, t) => sum + (t.amount > 0 && !t.isVoid ? t.amount : 0), 0);
  const totalPayments = history.reduce((sum, t) => sum + (t.paid > 0 && !t.isVoid ? t.paid : 0), 0);

  const generateMessage = (c) => 
    `Hello ${c.name}, this is ${currentStore?.name || "Store"}. Your current balance is ${formatCurrency(c.balance, currency)}. Please send payment when you can. Thank you!`;

  const handleRecordSale = () => {
    setPrefillTransaction({ 
      customerId: customerData.id, 
      name: customerData.name, 
      phone: customerData.phone, 
      items: "", 
      amount: "", 
      paid: "0" 
    });
    setView("record");
  };

  const handleMakePayment = () => {
    setPrefillTransaction({ 
      customerId: customerData.id, 
      name: customerData.name, 
      phone: customerData.phone, 
      items: "Payment", 
      amount: "0", 
      paid: "" 
    });
    setView("record");
  };

  const handleClearBalance = async () => {
    if (customerData.balance <= 0) return;
    try {
      await CustomerService.clearDebt(currentStore.id, customerData.id);
      const updated = await CustomerService.getById(customerData.id);
      setCustomerData(updated);
      triggerConfetti();
      showToast("✅ Balance cleared!");
    } catch (error) {
      showToast("❌ Failed to clear balance.");
    }
  };

  const handleCancelTransaction = () => setShowCancelModal(true);

  const executeCancelTransaction = async () => {
    if (!cancelReason.trim()) { showToast("⚠️ Please provide a reason."); return; }
    setShowCancelModal(false);
    try {
      await CustomerService.voidTransaction(viewingTransaction.id, cancelReason);
      const updated = await CustomerService.getById(customerData.id);
      setCustomerData(updated);
      const updatedHistory = await CustomerService.getHistory(customerData.id);
      setHistory(updatedHistory);
      setViewingTransaction(null);
      showToast("✅ Transaction canceled!");
    } catch (error) { showToast("❌ Failed to cancel."); }
    setCancelReason("");
  };

  const handleRedoTransaction = () => setShowRedoModal(true);

  const executeRedoTransaction = async () => {
    setShowRedoModal(false);
    try {
      await CustomerService.redoTransaction(viewingTransaction.id);
      const updated = await CustomerService.getById(customerData.id);
      setCustomerData(updated);
      const updatedHistory = await CustomerService.getHistory(customerData.id);
      setHistory(updatedHistory);
      setViewingTransaction(null);
      showToast("✅ Transaction restored!");
    } catch (error) { showToast("❌ Failed to restore."); }
  };

  const handleArchive = async () => {
    setShowArchiveModal(false);
    showToast("Customer archived.");
    setView("customers");
    setSelectedCustomer(null);
  };

  const getTimelineIcon = (tx) => {
    if (tx.isVoid) return <Ban size={16} className="text-gray-500" />;
    if (tx.amount > 0 && tx.paid === 0) return <FileText size={16} className="text-orange-500" />;
    if (tx.amount === 0 && tx.paid > 0) return <Check size={16} className="text-green-500" />;
    return <FileText size={16} className="text-green-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Customer Profile" showBack={true} onBack={() => { setView("customers"); setSelectedCustomer(null); }} />
      
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">
        
        {/* 1. Summary Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm text-center border border-gray-100 dark:border-gray-700">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold">
            {customerData.name.charAt(0)}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{customerData.name}</h3>
          <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 mt-1">
            <Phone size={14} /> {customerData.phone}
          </p>
          <div className={`mt-4 text-4xl font-bold ${customerData.balance > 0 ? "text-orange-600 dark:text-orange-400" : customerData.balance < 0 ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"}`}>
            {customerData.balance < 0 ? `Credit: ${formatCurrency(Math.abs(customerData.balance), currency)}` : formatCurrency(customerData.balance, currency)}
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {customerData.balance > 0 ? "Amount Owed" : customerData.balance < 0 ? "Overpaid (Credit)" : "All Paid Up"}
          </p>
        </div>

        {/* 2. Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 uppercase font-bold">Total Sales</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalSales, currency)}</p>
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
            <p className="text-xs text-gray-500 uppercase font-bold">Customer Since</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{customerData.createdAt ? formatDate(customerData.createdAt).split(',')[0] : 'N/A'}</p>
          </div>
        </div>

        {/* 3. Action Buttons */}
        <div className="grid grid-cols-4 gap-2">
          <button onClick={handleRecordSale} className="bg-green-600 text-white p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition shadow-md">
            <FileText size={20} /> <span className="text-[10px] font-bold">Sale</span>
          </button>
          <button onClick={handleMakePayment} className="bg-blue-600 text-white p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition shadow-md">
            <Check size={20} /> <span className="text-[10px] font-bold">Payment</span>
          </button>
          <button onClick={() => openWhatsApp(customerData.phone, generateMessage(customerData))} className="bg-green-500 text-white p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition shadow-md">
            <MessageCircle size={20} /> <span className="text-[10px] font-bold">WhatsApp</span>
          </button>
          <button onClick={() => openSMS(customerData.phone, generateMessage(customerData))} className="bg-blue-500 text-white p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition shadow-md">
            <MessageSquare size={20} /> <span className="text-[10px] font-bold">SMS</span>
          </button>
          <button onClick={() => openDialer(customerData.phone)} className="col-span-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
            <Phone size={18} /> <span className="text-xs font-bold">Call Customer</span>
          </button>
          <button onClick={() => showToast("Edit feature coming soon")} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition">
            <Edit3 size={18} /> <span className="text-[10px] font-bold">Edit</span>
          </button>
          <button onClick={() => setShowArchiveModal(true)} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition">
            <Archive size={18} /> <span className="text-[10px] font-bold">Archive</span>
          </button>
        </div>

        {/* 4. Transaction History Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Clock size={18} /> Transaction History
          </div>
          <div className="p-4 space-y-3">
            {history.length === 0 ? (
              <p className="text-center text-gray-400 py-6">No transaction history yet</p>
            ) : (
              [...history].reverse().map((tx) => (
                <button 
                  key={tx.id} 
                  onClick={() => setViewingTransaction(tx)}
                  className={`w-full text-left p-4 rounded-xl border transition-all active:scale-[0.98] ${
                    tx.isVoid 
                      ? 'border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/5 opacity-80' 
                      : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-green-200 dark:hover:border-green-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`p-1.5 rounded-full ${tx.isVoid ? 'bg-red-100 dark:bg-red-900/40' : 'bg-green-100 dark:bg-green-900/30'}`}>
                        {getTimelineIcon(tx)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm truncate ${tx.isVoid ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                          {tx.items && tx.items.length > 0 ? `${tx.items.length} Item(s)` : (tx.note || "General Transaction")}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{formatDate(tx.date)}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      {tx.amount > 0 && <p className={`text-sm font-bold ${tx.isVoid ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(tx.amount, currency)}</p>}
                      {tx.isVoid && <span className="text-[9px] text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded font-bold uppercase">Canceled</span>}
                    </div>
                  </div>
                  {tx.paid > 0 && !tx.isVoid && (
                    <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-1 pl-9">Paid: {formatCurrency(tx.paid, currency)}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* VIEW INVOICE / DETAILS MODAL (Immutable Facts) */}
      {viewingTransaction && (
        <div className="fixed inset-0 bg-black/60 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <FileText size={20} className="text-green-600" /> Sale Receipt
              </h3>
              <button onClick={() => setViewingTransaction(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={18} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              {/* Status Badge */}
              <div className="flex justify-center">
                {viewingTransaction.isVoid ? (
                  <span className="px-4 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold uppercase tracking-wider">Canceled Transaction</span>
                ) : (
                  <span className="px-4 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">Completed</span>
                )}
              </div>

              {/* Historical Items List (Immutable Facts) */}
              {viewingTransaction.items && viewingTransaction.items.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
                    Items Sold ({viewingTransaction.items.length})
                  </p>
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {viewingTransaction.items.map((item, idx) => (
                        <div key={idx} className={`px-4 py-3 ${viewingTransaction.isVoid ? 'opacity-60' : ''}`}>
                          <div className="sm:hidden space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0 pr-2">
                                <p className={`font-semibold text-sm text-gray-900 dark:text-white truncate ${viewingTransaction.isVoid ? 'line-through' : ''}`}>
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-wider">
                                  {item.unitName || 'Piece'}
                                </p>
                              </div>
                              <p className={`text-base font-bold flex-shrink-0 ${viewingTransaction.isVoid ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                                {formatCurrency(item.total || 0, currency)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500 dark:text-gray-400">Qty:</span>
                                <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded font-bold">
                                  {item.quantity || 1}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500 dark:text-gray-400">Price:</span>
                                <span className="font-semibold text-purple-600 dark:text-purple-400">
                                  {formatCurrency(item.price || 0, currency)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Details */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Date</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatDate(viewingTransaction.date)}</span>
                </div>
                {viewingTransaction.note && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Note</span>
                    <span className="font-semibold text-gray-900 dark:text-white text-right max-w-[60%] truncate">{viewingTransaction.note}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-2"></div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Total Sale</span>
                  <span className={`font-bold ${viewingTransaction.isVoid ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                    {formatCurrency(viewingTransaction.amount, currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Amount Paid</span>
                  <span className={`font-bold ${viewingTransaction.isVoid ? 'line-through text-gray-400' : 'text-green-600 dark:text-green-400'}`}>
                    {formatCurrency(viewingTransaction.paid, currency)}
                  </span>
                </div>
              </div>

              {/* Cancellation Reason */}
              {viewingTransaction.isVoid && viewingTransaction.voidReason && (
                <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
                  <p className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 mb-1">
                    <AlertTriangle size={10} /> Reason for Cancellation
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">{viewingTransaction.voidReason}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2">
                {!viewingTransaction.isVoid ? (
                  <button 
                    onClick={handleCancelTransaction}
                    className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <Ban size={18} /> Cancel this Transaction
                  </button>
                ) : (
                  <button 
                    onClick={handleRedoTransaction}
                    className="w-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <RotateCcw size={18} /> Redo / Restore Transaction
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><AlertTriangle size={20} className="text-red-600 dark:text-red-400" /></div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Cancel Transaction?</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">This will reverse the <span className="font-bold text-orange-600">{formatCurrency(viewingTransaction?.amount, currency)}</span> sale.</p>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Reason *</label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g., Recorded wrong amount..." className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 dark:text-white mb-4 text-sm" rows="3" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Go Back</button>
              <button onClick={executeCancelTransaction} disabled={!cancelReason.trim()} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition">Yes, Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Redo Confirmation Modal */}
      {showRedoModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full"><RotateCcw size={20} className="text-green-600 dark:text-green-400" /></div>
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Redo Transaction?</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">This will restore the canceled <span className="font-bold text-orange-600">{formatCurrency(viewingTransaction?.amount, currency)}</span> sale and add it back to the balance.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowRedoModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Go Back</button>
              <button onClick={executeRedoTransaction} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl active:scale-95 transition">Yes, Redo</button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Archive Customer?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">This will hide <span className="font-bold text-green-600">{customerData.name}</span> from your active list.</p>
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