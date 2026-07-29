import { useState } from "react";
import { Phone, PlusCircle, MessageCircle, MessageSquare, Edit3, Trash2, ShoppingBag, CreditCard, Ban, Clock, FileText, RefreshCw } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { openSMS, openWhatsApp, openDialer } from "../utils/communication";
import { CustomerService } from "../services/CustomerService";
import { PageHeader } from "../components/PageHeader";
import { InvoiceModal } from "../components/InvoiceModal";
import { EditCustomerModal } from "../components/EditCustomerModal";

export const ProfilePage = () => {
  const { 
    currentStore, 
    selectedCustomer, 
    setSelectedCustomer, 
    setView, 
    refreshCustomers, 
    showToast, 
    triggerConfetti, 
    setPrefillTransaction 
  } = useStore();
  
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showClearDebtModal, setShowClearDebtModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (!selectedCustomer) return null;

  const history = selectedCustomer.history || [];
  const totalPurchases = history.reduce((sum, t) => sum + (t.amount > 0 && !t.isVoid ? t.amount : 0), 0);
  const totalPaid = history.reduce((sum, t) => sum + (t.paid > 0 && !t.isVoid ? t.paid : 0), 0);

  const generateReminderMessage = (c) =>
    `Hello ${c.name}, this is a reminder from ${currentStore.name}. You have an outstanding debt of ${formatCurrency(c.balance)}. Please visit us or send payment via MoMo. Thank you!`;

  const handleRecordPayment = () => {
    setPrefillTransaction({ customerId: selectedCustomer.id, name: selectedCustomer.name, phone: selectedCustomer.phone, items: "Payment", amount: "0", paid: "" });
    setView("record");
  };

  const handleAddPurchase = () => {
    setPrefillTransaction({ customerId: selectedCustomer.id, name: selectedCustomer.name, phone: selectedCustomer.phone, items: "", amount: "", paid: "" });
    setView("record");
  };

  // 👇 NEW: Void & Duplicate (Redo) Logic
  const handleRedoTransaction = async (tx) => {
    if (!window.confirm(`This will VOID this invoice and open a corrected copy for you to fix. Continue?`)) return;
    
    try {
      // 1. Void the old transaction immediately
      await CustomerService.voidTransaction(currentStore.id, selectedCustomer.id, tx.id);
      await refreshCustomers();
      
      // 2. Pre-fill the Record page with the old data so they don't have to re-type
      setPrefillTransaction({
        customerId: selectedCustomer.id, // Use current customer ID
        name: selectedCustomer.name,
        phone: selectedCustomer.phone,
        items: tx.items || "",
        amount: tx.amount.toString(),
        paid: tx.paid.toString(),
        invoiceItems: tx.invoiceItems || null // Pass detailed items if they exist!
      });
      
      showToast("Old invoice voided. Please correct and save the new one.");
      setView("record");
    } catch (error) {
      console.error(error);
      showToast("Failed to redo transaction");
    }
  };

  const executeClearDebt = async () => {
    if (confirmText.toLowerCase().trim() !== "yes") return;
    setShowClearDebtModal(false);
    setConfirmText("");
    try {
      await CustomerService.clearDebt(currentStore.id, selectedCustomer.id);
      const refreshed = await refreshCustomers();
      setSelectedCustomer(refreshed.find(c => c.id === selectedCustomer.id));
      triggerConfetti();
      showToast("Debt cleared!");
    } catch (error) { showToast("Failed to clear debt"); }
  };

  const executeDelete = async () => {
    if (deleteConfirmText.toLowerCase().trim() !== "yes") return;
    setShowDeleteModal(false);
    setDeleteConfirmText("");
    try {
      await CustomerService.deleteCustomer(currentStore.id, selectedCustomer.id);
      await refreshCustomers();
      setSelectedCustomer(null);
      setView("home");
      showToast("Customer deleted permanently");
    } catch (error) { showToast("Failed to delete customer"); }
  };

  const handleVoidTransaction = async (tx) => {
    if (!window.confirm(`VOID "${tx.items}" for ${formatCurrency(tx.amount)}? This will reverse the transaction.`)) return;
    try {
      await CustomerService.voidTransaction(currentStore.id, selectedCustomer.id, tx.id);
      await refreshCustomers();
      showToast("Transaction voided");
    } catch (error) { showToast("Failed to void"); }
  };

  const getTimelineIcon = (tx) => {
    if (tx.isVoid) return <Ban size={16} className="text-gray-500" />;
    if (tx.amount > 0 && tx.paid === 0) return <ShoppingBag size={16} className="text-orange-500" />;
    if (tx.amount === 0 && tx.paid > 0) return <CreditCard size={16} className="text-green-500" />;
    return <ShoppingBag size={16} className="text-blue-500" />;
  };

  const getTimelineColor = (tx) => {
    if (tx.isVoid) return "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 opacity-70";
    if (tx.amount > 0 && tx.paid === 0) return "border-orange-200 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10";
    if (tx.amount === 0 && tx.paid > 0) return "border-green-200 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10";
    return "border-blue-200 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Customer Profile" onBack={() => { setView("home"); setSelectedCustomer(null); }} />
      
      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Header & Balance */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm text-center border border-gray-100 dark:border-gray-700">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold">
            {selectedCustomer.name.charAt(0)}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCustomer.name}</h3>
          <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 mt-1"><Phone size={14} /> {selectedCustomer.phone}</p>
          {selectedCustomer.altPhone && <p className="text-gray-400 text-xs mt-1">Alt: {selectedCustomer.altPhone}</p>}
          
          <div className={`mt-4 text-4xl font-bold ${selectedCustomer.balance > 0 ? "text-red-600 dark:text-red-400" : selectedCustomer.balance < 0 ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"}`}>
            {selectedCustomer.balance < 0 ? `Credit: ${formatCurrency(Math.abs(selectedCustomer.balance))}` : formatCurrency(selectedCustomer.balance)}
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Current Balance</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 uppercase font-bold">Total Purchases</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalPurchases)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 uppercase font-bold">Total Paid</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 uppercase font-bold">Transactions</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{history.filter(t => !t.isVoid).length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 uppercase font-bold">Customer Since</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{selectedCustomer.joined ? formatDate(selectedCustomer.joined).split(',')[0] : 'N/A'}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          <button onClick={handleAddPurchase} className="bg-green-700 text-white p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition shadow-md">
            <PlusCircle size={20} /> <span className="text-[10px] font-bold">Purchase</span>
          </button>
          <button onClick={handleRecordPayment} className="bg-blue-600 text-white p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition shadow-md">
            <CreditCard size={20} /> <span className="text-[10px] font-bold">Payment</span>
          </button>
          <button onClick={() => openWhatsApp(selectedCustomer.phone, generateReminderMessage(selectedCustomer))} className="bg-green-500 text-white p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition shadow-md">
            <MessageCircle size={20} /> <span className="text-[10px] font-bold">WhatsApp</span>
          </button>
          <button onClick={() => openSMS(selectedCustomer.phone, generateReminderMessage(selectedCustomer))} className="bg-blue-500 text-white p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition shadow-md">
            <MessageSquare size={20} /> <span className="text-[10px] font-bold">SMS</span>
          </button>
          <button onClick={() => openDialer(selectedCustomer.phone)} className="col-span-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition">
            <Phone size={18} /> <span className="text-xs font-bold">Call Customer</span>
          </button>
          <button onClick={() => setIsEditing(true)} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition">
            <Edit3 size={18} /> <span className="text-[10px] font-bold">Edit</span>
          </button>
          <button onClick={() => setShowDeleteModal(true)} className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl flex flex-col items-center gap-1 active:scale-95 transition">
            <Trash2 size={18} /> <span className="text-[10px] font-bold">Delete</span>
          </button>
        </div>

        {/* Customer Timeline */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Clock size={18} /> Customer Timeline
          </div>
          
          <div className="p-4 space-y-0">
            {history.length === 0 ? (
              <p className="text-center text-gray-400 py-6">No activity yet</p>
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
                      <p className={`font-bold text-sm flex items-center flex-wrap gap-2 ${tx.isVoid ? 'text-gray-500 line-through decoration-red-500 decoration-2' : 'text-gray-900 dark:text-white'}`}>
                        {tx.items || "General Transaction"} 
                        {tx.isVoid && <span className="text-[10px] text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 rounded font-bold no-underline tracking-wider">VOIDED</span>}
                      </p>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2 mt-0.5">{formatDate(tx.date)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm mt-2">
                      <div className="space-y-0.5">
                        {tx.amount > 0 && <p className={`text-gray-600 dark:text-gray-300 ${tx.isVoid ? 'line-through' : ''}`}>Purchase: <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(tx.amount)}</span></p>}
                        {tx.paid > 0 && <p className={`text-green-600 dark:text-green-400 ${tx.isVoid ? 'line-through' : ''}`}>Paid: <span className="font-bold">{formatCurrency(tx.paid)}</span></p>}
                      </div>
                      <div className="flex gap-1">
                        {/* 👇 NEW: Redo Button (Void & Duplicate) */}
                        {!tx.isVoid && (
                          <button 
                            onClick={() => handleRedoTransaction(tx)} 
                            className="p-1.5 bg-white dark:bg-gray-700 rounded-lg text-gray-500 hover:text-blue-600 transition shadow-sm"
                            title="Fix / Redo this invoice"
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}
                        
                        <button 
                          onClick={() => setViewingInvoice(tx)} 
                          className="p-1.5 bg-white dark:bg-gray-700 rounded-lg text-gray-500 hover:text-green-600 transition shadow-sm"
                          title="View Receipt"
                        >
                          <FileText size={14} />
                        </button>
                        
                        {!tx.isVoid && (
                          <button 
                            onClick={() => handleVoidTransaction(tx)} 
                            className="p-1.5 bg-white dark:bg-gray-700 rounded-lg text-gray-500 hover:text-red-600 transition shadow-sm"
                            title="Void Transaction"
                          >
                            <Ban size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedCustomer.notes && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 p-4 rounded-2xl">
            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-400 uppercase mb-1">Notes</p>
            <p className="text-sm text-yellow-900 dark:text-yellow-200">{selectedCustomer.notes}</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {viewingInvoice && <InvoiceModal onClose={() => setViewingInvoice(null)} transaction={viewingInvoice} />}
      {isEditing && <EditCustomerModal customer={selectedCustomer} onClose={() => setIsEditing(false)} />}
      
      {/* Clear Debt Modal */}
      {showClearDebtModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Clear Debt?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Type <span className="text-red-600 font-mono bg-red-50 px-1 rounded">yes</span> to clear {formatCurrency(selectedCustomer.balance)}.</p>
            <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white mb-4 text-center font-mono" placeholder="yes" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowClearDebtModal(false)} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Cancel</button>
              <button onClick={executeClearDebt} disabled={confirmText.toLowerCase().trim() !== "yes"} className="flex-1 bg-green-700 text-white font-bold py-3 rounded-xl disabled:opacity-50">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Strict Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Delete Customer?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              This will permanently delete <span className="font-bold text-red-600">{selectedCustomer.name}</span> and all their transaction history. This cannot be undone.
            </p>
            <p className="text-gray-600 dark:text-gray-400 mb-2 text-sm">
              Type <span className="text-red-600 font-mono bg-red-50 dark:bg-red-900/30 px-1 rounded">yes</span> to confirm.
            </p>
            <input 
              type="text" 
              value={deleteConfirmText} 
              onChange={(e) => setDeleteConfirmText(e.target.value)} 
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 dark:text-white mb-4 text-center font-mono" 
              placeholder="yes" 
              autoFocus 
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Cancel</button>
              <button 
                onClick={executeDelete} 
                disabled={deleteConfirmText.toLowerCase().trim() !== "yes"} 
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};