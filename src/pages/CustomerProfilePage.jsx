import { useState, useEffect, useMemo, useRef } from "react";
import { Trash2, HeartHandshake } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { openDialer } from "../utils/communication";
import { buildAllocationMap, saleRemaining, computeRetroAllocations } from "../utils/allocation";
import { CustomerService } from "../services/CustomerService";
import { TransactionService } from "../services/TransactionService";
import { AllocationService } from "../services/AllocationService";
import { AccountShareService } from "../services/AccountShareService";
import { ShareAccountModal } from "../components/ShareAccountModal";
import { AddCustomerModal } from "../components/customer/AddCustomerModal";
import { DeleteContactModal } from "../components/DeleteContactModal";
import { TopBar } from "../components/TopBar";

// Import our new clean components
import { CustomerHeader } from "./customer/components/CustomerHeader";
import { BalanceCard } from "./customer/components/BalanceCard";
import { QuickActions } from "./customer/components/QuickActions";
import { OutstandingInvoices } from "./customer/components/OutstandingInvoices";
import { TransactionHistory } from "./customer/components/TransactionHistory";
import { MoreInformation } from "./customer/components/MoreInformation";
import { ReceiptModal } from "./customer/components/ReceiptModal";
import { ForgiveDebtModal } from "./customer/components/ForgiveDebtModal";
import { FixReasonModal } from "./customer/components/FixReasonModal";
import { CancelModal } from "./customer/components/CancelModal";
import { normalizeList, isActive, isWriteOffTx, getTrueOutstanding } from "./customer/utils/helpers";

export const CustomerProfilePage = () => {
  const { currentStore, selectedCustomer, setSelectedCustomer, setView, setPrefillTransaction, setFixTransaction, showToast, readOnly } = useStore();
  const currency = currentStore?.currency || "GH₵";

  const blockIfReadOnly = () => {
    if (readOnly) { showToast("🔒 Subscription expired — please renew to continue."); return true; }
    return false;
  };

  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [customerData, setCustomerData] = useState(selectedCustomer);
  const [history, setHistory] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [expandedOldTx, setExpandedOldTx] = useState(null);
  const [showFixModal, setShowFixModal] = useState(false);
  const [fixReason, setFixReason] = useState("");
  const [txToFix, setTxToFix] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showForgiveModal, setShowForgiveModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    if (selectedCustomer?.id) {
      CustomerService.getById(selectedCustomer.id).then(setCustomerData);
      Promise.all([
        TransactionService.getHistory(selectedCustomer.id).then(res => normalizeList(res)).catch(() => []),
        AllocationService.getByContact(selectedCustomer.id).catch(() => []),
      ]).then(([h, a]) => { setHistory(h); setAllocations(a); });
    }
  }, [selectedCustomer?.id]);

  useEffect(() => { setVisibleCount(10); }, [selectedCustomer?.id]);

  // AUTOMATIC healing — guarded so it can NEVER run twice at the same time
  const healRunning = useRef(false);
  useEffect(() => {
    if (!selectedCustomer?.id || history.length === 0) return;
    if (healRunning.current) return;
    healRunning.current = true;
    (async () => {
      try {
        const rows = computeRetroAllocations(history, allocations);
        if (rows.length > 0) {
          await AllocationService.createMany(rows);
          const fresh = await AllocationService.getByContact(selectedCustomer.id);
          setAllocations(fresh);
        }
      } catch (error) { console.error("Auto-match failed:", error); } 
      finally { healRunning.current = false; }
    })();
  }, [history, allocations, selectedCustomer?.id]);

  if (!customerData) return null;

  // CALCULATIONS — allocation-aware
  const allocationMap = useMemo(() => buildAllocationMap(allocations, history), [allocations, history]);
  const lastPayment = useMemo(() => history.find(tx => (parseFloat(tx.paid) || 0) > 0 && (tx.type === 'payment' || tx.type === 'sale') && !isWriteOffTx(tx) && isActive(tx)), [history]);

  const outstandingInvoices = useMemo(() =>
    history.filter(tx => tx.type === 'sale' && isActive(tx) && !tx.replacedByTransactionId)
      .map(tx => {
        const original = getTrueOutstanding(tx);
        const remaining = saleRemaining(tx, allocationMap);
        return { ...tx, trueOutstanding: remaining, originalOutstanding: original, allocated: original - remaining };
      }).filter(tx => tx.trueOutstanding > 0),
    [history, allocationMap]);

  const trueBalance = useMemo(() => {
    let bal = 0;
    history.forEach(t => {
      if (!isActive(t)) return;
      const amt = parseFloat(t.amount) || 0;
      const pd = parseFloat(t.paid) || 0;
      if (t.type === 'sale') bal += amt - pd;
      else if (t.type === 'payment') bal -= pd;
    });
    return bal;
  }, [history]);

  const totalSales = history.reduce((sum, t) => sum + ((parseFloat(t.amount) || 0) > 0 && t.type === 'sale' && isActive(t) ? (parseFloat(t.amount) || 0) : 0), 0);
  const totalPayments = history.reduce((sum, t) => sum + ((parseFloat(t.paid) || 0) > 0 && !isWriteOffTx(t) && isActive(t) ? (parseFloat(t.paid) || 0) : 0), 0);
  const visibleHistory = useMemo(() => history.filter(tx => !tx.replacedByTransactionId), [history]);
  const pagedHistory = useMemo(() => visibleHistory.slice(0, visibleCount), [visibleHistory, visibleCount]);

  const daysSinceLastActive = useMemo(() => {
    const last = customerData.lastActivity || customerData.last_activity;
    if (!last) return null;
    const days = Math.floor((new Date() - new Date(last)) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }, [customerData]);

  // HANDLERS (all guarded)
  const handleRecordSale = () => {
    if (blockIfReadOnly()) return;
    setPrefillTransaction({ customerId: customerData.id, name: customerData.name, phone: customerData.phone, amount: "", paid: "0" });
    setView("record");
  };

  const handleReceivePayment = () => {
    if (blockIfReadOnly()) return;
    setPrefillTransaction({ customerId: customerData.id, name: customerData.name, phone: customerData.phone });
    setView("recordPayment");
  };

  const handleShareAccount = async (shareData) => {
    try {
      const reference = AccountShareService.generateShareReference();
      await AccountShareService.logShare({ storeId: currentStore.id, contactId: customerData.id, channel: shareData.channel, scope: shareData.scope, reference });
      showToast("✅ Account shared successfully");
    } catch (error) { console.error(error); showToast("❌ Failed to log share event"); }
  };

  const handleFixTransaction = (tx) => { if (blockIfReadOnly()) return; setTxToFix(tx); setFixReason(""); setShowFixModal(true); };
  const confirmFix = () => { setFixTransaction({ ...txToFix, fixReason: fixReason }); setShowFixModal(false); setViewingTransaction(null); setView(txToFix.type === 'payment' ? 'recordPayment' : 'record'); };
  const handleCancelTransaction = (tx) => { if (blockIfReadOnly()) return; setCancelReason(""); setShowCancelModal(true); };

  const executeCancelTransaction = async () => {
    if (!cancelReason.trim()) { showToast("⚠️ Please provide a reason."); return; }
    setShowCancelModal(false);
    try {
      await TransactionService.cancelTransaction(viewingTransaction.id, cancelReason);
      const updatedHistory = await TransactionService.getHistory(customerData.id);
      let bal = 0;
      (Array.isArray(updatedHistory) ? updatedHistory : []).forEach(t => {
        if (!isActive(t)) return;
        const amt = parseFloat(t.amount) || 0;
        const pd = parseFloat(t.paid) || 0;
        if (t.type === 'sale') bal += amt - pd;
        else if (t.type === 'payment') bal -= pd;
      });
      await CustomerService.updateBalance(customerData.id, bal);
      const updated = await CustomerService.getById(customerData.id);
      setCustomerData(updated); setHistory(normalizeList(updatedHistory)); setViewingTransaction(null);
      showToast("✅ Transaction cancelled!");
    } catch (error) { console.error(error); showToast("❌ Failed to cancel."); }
    setCancelReason("");
  };

  const executeForgiveDebt = async (amount, reason) => {
    if (blockIfReadOnly()) return;
    try {
      await TransactionService.recordWriteOff(currentStore.id, customerData.id, amount, reason);
      const updatedHistory = await TransactionService.getHistory(customerData.id);
      let bal = 0;
      (Array.isArray(updatedHistory) ? updatedHistory : []).forEach(t => {
        if (!isActive(t)) return;
        const amt = parseFloat(t.amount) || 0;
        const pd = parseFloat(t.paid) || 0;
        if (t.type === 'sale') bal += amt - pd;
        else if (t.type === 'payment') bal -= pd;
      });
      await CustomerService.updateBalance(customerData.id, bal);
      const updated = await CustomerService.getById(customerData.id);
      setCustomerData(updated); setHistory(normalizeList(updatedHistory)); setShowForgiveModal(false);
      showToast(`🤝 ${formatCurrency(amount, currency)} of debt forgiven`);
    } catch (error) { console.error(error); showToast("❌ Failed to forgive debt"); throw error; }
  };

  const toggleOldReceipt = async (tx) => {
    if (expandedOldTx && expandedOldTx.id === tx.correctsTransactionId) { setExpandedOldTx(null); } 
    else { const oldTx = await TransactionService.getById(tx.correctsTransactionId); setExpandedOldTx(normalizeList([oldTx])[0]); }
  };

  const handleDeleteCustomer = async () => {
    if (blockIfReadOnly()) return;
    try {
      await CustomerService.delete(customerData.id);
      showToast(`🗑️ ${customerData.name} deleted`);
      setSelectedCustomer(null); setView("customers");
    } catch (error) { console.error(error); showToast("❌ Failed to delete customer"); throw error; }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Customer Profile" showBack={true} onBack={() => { setView("customers"); setSelectedCustomer(null); }} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-5">
        <CustomerHeader customer={customerData} daysSinceLastActive={daysSinceLastActive} onEdit={() => { if (!blockIfReadOnly()) setIsEditModalOpen(true); }} />
        <BalanceCard balance={trueBalance} lastPayment={lastPayment} currency={currency} />
        
        {trueBalance > 0 && (
          <button onClick={() => { if (!blockIfReadOnly()) setShowForgiveModal(true); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-purple-200 dark:border-purple-900/40 text-purple-600 dark:text-purple-400 text-sm font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/10 active:scale-95 transition">
            <HeartHandshake size={16} /> Forgive Debt (Write Off)
          </button>
        )}

        <QuickActions onSale={handleRecordSale} onPayment={handleReceivePayment} onCall={() => openDialer(customerData.phone)} onShare={() => setShowShareModal(true)} />
        <OutstandingInvoices invoices={outstandingInvoices} onView={setViewingTransaction} currency={currency} />
        <TransactionHistory history={pagedHistory} onView={setViewingTransaction} onToggleOld={toggleOldReceipt} expandedOldTx={expandedOldTx} setViewingTransaction={setViewingTransaction} currency={currency} hasMore={visibleHistory.length > visibleCount} onLoadMore={() => setVisibleCount(c => c + 10)} shownCount={pagedHistory.length} totalCount={visibleHistory.length} />
        <MoreInformation totalSales={totalSales} totalPayments={totalPayments} historyLength={visibleHistory.length} createdAt={customerData.created_at || customerData.createdAt} currency={currency} />

        <div className="pt-2">
          <button onClick={() => { if (!blockIfReadOnly()) setShowDeleteModal(true); }} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-95 transition">
            <Trash2 size={16} /> Delete this customer
          </button>
        </div>
      </div>

      {!showFixModal && !showCancelModal && (
        <ReceiptModal tx={viewingTransaction} customer={customerData} currentStore={currentStore} onClose={() => setViewingTransaction(null)} onFix={handleFixTransaction} onCancel={handleCancelTransaction} currency={currency} history={history} allocations={allocations} />
      )}
      <FixReasonModal isOpen={showFixModal} onClose={() => setShowFixModal(false)} onConfirm={confirmFix} fixReason={fixReason} setFixReason={setFixReason} />
      <CancelModal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={executeCancelTransaction} cancelReason={cancelReason} setCancelReason={setCancelReason} type={viewingTransaction?.type} />
      <ShareAccountModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} contact={customerData} transactions={history} store={currentStore} onShared={handleShareAccount} />
      <AddCustomerModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} customer={customerData} onSaved={() => { CustomerService.getById(customerData.id).then(setCustomerData); }} />
      <DeleteContactModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteCustomer} contact={customerData} type="customer" transactions={history} currency={currency} />
      <ForgiveDebtModal isOpen={showForgiveModal} onClose={() => setShowForgiveModal(false)} onConfirm={executeForgiveDebt} balance={trueBalance} currency={currency} customerName={customerData.name} />
    </div>
  );
};