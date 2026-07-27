import { useState } from "react";
import { Phone, PlusCircle, Gift, MessageCircle, MessageSquare, FileText, Edit3, Trash2, Ban } from "lucide-react";
import { useApp } from "../contexts/AppContext";
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
  } = useApp();
  
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 👇 NEW: States for Clear Debt Confirmation
  const [showClearDebtModal, setShowClearDebtModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (!selectedCustomer) return null;

  const generateReminderMessage = (c) => {
    if (c.balance < 0) {
      return `Hello ${c.name}, thank you! You have a credit of ${formatCurrency(Math.abs(c.balance))} with ${currentStore.name}. This will be used for your next purchase. Thank you!`;
    }
    if (c.balance === 0) {
      return `Hello ${c.name}, thank you! Your debt with ${currentStore.name} is fully cleared. We appreciate your business!`;
    }
    return `Hello ${c.name}, this is a reminder from ${currentStore.name}. You have an outstanding debt of ${formatCurrency(c.balance)}. Please visit us or send payment via MoMo. Thank you!`;
  };

  // 👇 Opens the modal instead of executing immediately
  const handleMarkPaid = () => {
    if (selectedCustomer.balance <= 0) return;
    setShowClearDebtModal(true);
    setConfirmText("");
  };

  // 👇 Executes only after "yes" is typed
  const executeClearDebt = async () => {
    if (confirmText.toLowerCase().trim() !== "yes") return;
    
    setShowClearDebtModal(false);
    setConfirmText("");
    
    try {
      await CustomerService.clearDebt(currentStore.id, selectedCustomer.id);
      const refreshed = await refreshCustomers();
      const updated = refreshed.find(c => c.id === selectedCustomer.id);
      setSelectedCustomer(updated);
      triggerConfetti();
      showToast("Debt cleared!");
    } catch (error) {
      console.error("Failed to clear debt:", error);
      showToast("Failed to clear debt");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(
      `⚠️ Are you sure you want to delete ${selectedCustomer.name}?\n\n` +
      `This will permanently remove:\n` +
      `• Customer details\n` +
      `• All ${selectedCustomer.history?.length || 0} transaction(s)\n\n` +
      `This action cannot be undone.`
    )) {
      return;
    }

    if (selectedCustomer.balance > 0) {
      if (!window.confirm(
        `⚠️ WARNING: This customer still owes ${formatCurrency(selectedCustomer.balance)}!\n\n` +
        `Are you absolutely sure you want to delete them?`
      )) {
        return;
      }
    }

    setIsDeleting(true);
    try {
      await CustomerService.deleteCustomer(currentStore.id, selectedCustomer.id);
      await refreshCustomers();
      setSelectedCustomer(null);
      setView("home");
      showToast("Customer deleted successfully");
    } catch (error) {
      console.error("Failed to delete customer:", error);
      showToast("Failed to delete customer");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVoidTransaction = async (tx) => {
    if (!window.confirm(
      `Are you sure you want to VOID this transaction?\n\n` +
      `"${tx.items || 'General Purchase'}" for ${formatCurrency(tx.amount)}\n\n` +
      `This will reverse the amount and update the balance.`
    )) {
      return;
    }

    try {
      const updatedCustomer = await CustomerService.voidTransaction(currentStore.id, selectedCustomer.id, tx.id);
      setSelectedCustomer(updatedCustomer);
      await refreshCustomers();
      showToast("Transaction voided successfully");
    } catch (error) {
      console.error("Failed to void transaction:", error);
      showToast("Failed to void transaction");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Customer Profile" onBack={() => { setView("home"); setSelectedCustomer(null); }} />
      
      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Customer Info Card */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm text-center border border-gray-100 dark:border-gray-700">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-gray-500 dark:text-gray-400">
            {selectedCustomer.name.charAt(0)}
          </div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCustomer.name}</h3>
          <p className="text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1 mt-1">
            <Phone size={16} /> {selectedCustomer.phone}
          </p>
          <div className={`mt-4 text-4xl font-bold ${
            selectedCustomer.balance > 0 ? "text-red-600 dark:text-red-400" : 
            selectedCustomer.balance < 0 ? "text-blue-600 dark:text-blue-400" : 
            "text-green-600 dark:text-green-400"
          }`}>
            {selectedCustomer.balance < 0 ? `Credit: ${formatCurrency(Math.abs(selectedCustomer.balance))}` : formatCurrency(selectedCustomer.balance)}
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {selectedCustomer.balance < 0 ? "Customer has an advance balance" : "Current Balance"}
          </p>
        </div>

        {/* Primary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => {
              setPrefillTransaction({
                customerId: selectedCustomer.id,
                name: selectedCustomer.name,
                phone: selectedCustomer.phone,
                items: "",
                amount: "",
                paid: ""
              });
              setView("record");
            }} 
            className="bg-green-700 text-white font-bold py-4 rounded-xl flex flex-col items-center gap-2 shadow-md active:scale-95 transition"
          >
            <PlusCircle size={24} /> Add Purchase
          </button>
          
          {/* 👇 Updated Clear Debt Button to open modal */}
          <button 
            onClick={handleMarkPaid} 
            disabled={selectedCustomer.balance <= 0} 
            className="bg-yellow-400 text-gray-900 font-bold py-4 rounded-xl flex flex-col items-center gap-2 shadow-md disabled:opacity-50 active:scale-95 transition"
          >
            <Gift size={24} /> Clear Debt
          </button>
          
          <button 
            onClick={() => openWhatsApp(selectedCustomer.phone, generateReminderMessage(selectedCustomer))} 
            className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold py-4 rounded-xl flex flex-col items-center gap-2 border border-green-200 dark:border-green-800 shadow-sm active:scale-95 transition"
          >
            <MessageCircle size={24} /> WhatsApp
          </button>
          <button 
            onClick={() => openSMS(selectedCustomer.phone, generateReminderMessage(selectedCustomer))} 
            className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold py-4 rounded-xl flex flex-col items-center gap-2 border border-blue-200 dark:border-blue-800 shadow-sm active:scale-95 transition"
          >
            <MessageSquare size={24} /> SMS
          </button>
          <button 
            onClick={() => openDialer(selectedCustomer.phone)} 
            className="col-span-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-4 rounded-xl flex flex-col items-center gap-2 border border-gray-200 dark:border-gray-600 shadow-sm active:scale-95 transition"
          >
            <Phone size={24} /> Call Customer
          </button>
        </div>

        {/* Edit & Delete Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase px-1">Manage Customer</p>
          </div>
          <div className="p-3 grid grid-cols-2 gap-3">
            <button
              onClick={() => setIsEditing(true)}
              className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-blue-200 dark:border-blue-800 active:scale-95 transition"
            >
              <Edit3 size={18} /> Edit Details
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-red-200 dark:border-red-800 active:scale-95 transition disabled:opacity-50"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Trash2 size={18} />
              )}
              Delete
            </button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300">
            Transaction History
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {[...selectedCustomer.history].reverse().map(h => (
              <div key={h.id} className={`p-4 flex justify-between items-center ${h.isVoid ? 'bg-red-50 dark:bg-red-900/10 opacity-60' : ''}`}>
                <div className="flex-1">
                  <p className={`font-semibold ${h.isVoid ? 'text-red-600 dark:text-red-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                    {h.items || "General Purchase"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(h.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className={`font-bold ${h.isVoid ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {formatCurrency(h.amount)}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">Paid: {formatCurrency(h.paid)}</p>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => setViewingInvoice(h)}
                      className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 active:scale-95 transition"
                      title="View Invoice"
                    >
                      <FileText size={16} />
                    </button>
                    {!h.isVoid && (
                      <button 
                        onClick={() => handleVoidTransaction(h)}
                        className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 active:scale-95 transition"
                        title="Void Transaction"
                      >
                        <Ban size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {selectedCustomer.history.length === 0 && (
              <p className="p-4 text-center text-gray-400 dark:text-gray-500">No transactions yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {viewingInvoice && (
        <InvoiceModal onClose={() => setViewingInvoice(null)} transaction={viewingInvoice} />
      )}
      
      {isEditing && (
        <EditCustomerModal 
          customer={selectedCustomer} 
          onClose={() => setIsEditing(false)} 
        />
      )}

      {/* 👇 NEW: Clear Debt Confirmation Modal */}
      {showClearDebtModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-xl text-gray-900 dark:text-white mb-2">Clear Debt?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This will mark the outstanding balance of <span className="font-bold text-red-600">{formatCurrency(selectedCustomer.balance)}</span> as fully paid for <span className="font-bold">{selectedCustomer.name}</span>.
            </p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Type <span className="text-red-600 font-mono bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">yes</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmText.toLowerCase().trim() === 'yes' && executeClearDebt()}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white mb-4 text-center font-mono text-lg"
              placeholder="yes"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowClearDebtModal(false); setConfirmText(""); }}
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={executeClearDebt}
                disabled={confirmText.toLowerCase().trim() !== "yes"}
                className="flex-1 bg-green-700 text-white font-bold py-3 rounded-xl hover:bg-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};