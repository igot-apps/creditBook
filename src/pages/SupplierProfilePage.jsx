import { useState, useEffect, useMemo, useRef } from "react";
import { Trash2 } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { openDialer } from "../utils/communication";
import { SupplierService } from "../services/SupplierService";
import { TransactionService } from "../services/TransactionService";
import { AllocationService } from "../services/AllocationService";
import { AccountShareService } from "../services/AccountShareService";
import { ShareAccountModal } from "../components/ShareAccountModal";
import { AddSupplierModal } from "../components/supplier/AddSupplierModal";
import { DeleteContactModal } from "../components/DeleteContactModal";
import { TopBar } from "../components/TopBar";

// Import our new clean components
import { SupplierHeader } from "./supplier/components/SupplierHeader";
import { BalanceCard } from "./supplier/components/BalanceCard";
import { QuickActions } from "./supplier/components/QuickActions";
import { OutstandingInvoices } from "./supplier/components/OutstandingInvoices";
import { TransactionHistory } from "./supplier/components/TransactionHistory";
import { MoreInformation } from "./supplier/components/MoreInformation";
import { ReceiptModal } from "./supplier/components/ReceiptModal";
import { FixReasonModal } from "./supplier/components/FixReasonModal";
import { CancelModal } from "./supplier/components/CancelModal";
import { normalizeList, isActive, buildAllocMap, retroRows } from "./supplier/utils/helpers";

export const SupplierProfilePage = () => {
  const { currentStore, selectedSupplier, setSelectedSupplier, setView, setPrefillTransaction, setFixTransaction, showToast, readOnly } = useStore();
  const currency = currentStore?.currency || "GH₵";

  const blockIfReadOnly = () => {
    if (readOnly) {
      showToast("🔒 Subscription expired — please renew to continue.");
      return true;
    }
    return false;
  };

  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [supplierData, setSupplierData] = useState(selectedSupplier);
  const [history, setHistory] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [expandedOldTx, setExpandedOldTx] = useState(null);
  const [showFixModal, setShowFixModal] = useState(false);
  const [fixReason, setFixReason] = useState("");
  const [txToFix, setTxToFix] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  // Load history + allocations together
  useEffect(() => {
    if (selectedSupplier?.id) {
      SupplierService.getById(selectedSupplier.id).then(setSupplierData);
      Promise.all([
        TransactionService.getHistory(selectedSupplier.id).then(res => normalizeList(res)).catch(() => []),
        AllocationService.getByContact(selectedSupplier.id).catch(() => []),
      ]).then(([h, a]) => { setHistory(h); setAllocations(a); });
    }
  }, [selectedSupplier?.id]);

  useEffect(() => {
    setVisibleCount(10);
  }, [selectedSupplier?.id]);

  // 👇 AUTOMATIC healing — guarded so it can NEVER run twice
  const healRunning = useRef(false);
  useEffect(() => {
    if (!selectedSupplier?.id || history.length === 0) return;
    if (healRunning.current) return;
    healRunning.current = true;
    (async () => {
      try {
        const rows = retroRows(history, allocations);
        if (rows.length > 0) {
          await AllocationService.createMany(rows);
          const fresh = await AllocationService.getByContact(selectedSupplier.id);
          setAllocations(fresh);
        }
      } catch (error) {
        console.error("Auto-match failed:", error);
      } finally {
        healRunning.current = false;
      }
    })();
  }, [history, allocations, selectedSupplier?.id]);

  if (!supplierData) return null;

  // ==========================================
  // CALCULATIONS — allocation-aware
  // ==========================================
  const getTrueOutstanding = (purchase) => Math.max(0, (parseFloat(purchase.amount) || 0) - (parseFloat(purchase.paid) || 0));
  const allocationMap = useMemo(() => buildAllocMap(allocations, history), [allocations, history]);
  const lastPayment = useMemo(() => history.find(tx => (parseFloat(tx.paid) || 0) > 0 && tx.type === 'supplier_payment' && isActive(tx)), [history]);

  // 👇 Purchases subtract allocated payments → fully-paid purchases disappear
  const outstandingInvoices = useMemo(() =>
    history
      .filter(tx => tx.type === 'purchase' && isActive(tx) && !tx.replacedByTransactionId)
      .map(tx => {
        const original = getTrueOutstanding(tx);
        const allocated = allocationMap[tx.id] || 0;
        const remaining = Math.max(0, original - allocated);
        return { ...tx, trueOutstanding: remaining, originalOutstanding: original, allocated: original - remaining };
      })
      .filter(tx => tx.trueOutstanding > 0),
    [history, allocationMap]);

  const trueBalance = useMemo(() => {
    let bal = 0;
    history.forEach(t => {
      if (!isActive(t)) return;
      const amt = parseFloat(t.amount) || 0;
      const pd = parseFloat(t.paid) || 0;
      if (t.type === 'purchase') bal += amt - pd;
      else if (t.type === 'supplier_payment') bal -= pd;
    });
    return bal;
  }, [history]);

  const totalPurchases = history.reduce((sum, t) => sum + ((parseFloat(t.amount) || 0) > 0 && t.type === 'purchase' && isActive(t) ? (parseFloat(t.amount) || 0) : 0), 0);
  const totalPayments = history.reduce((sum, t) => sum + ((parseFloat(t.paid) || 0) > 0 && t.type === 'supplier_payment' && isActive(t) ? (parseFloat(t.paid) || 0) : 0), 0);

  const visibleHistory = useMemo(() => history.filter(tx => !tx.replacedByTransactionId), [history]);
  const pagedHistory = useMemo(() => visibleHistory.slice(0, visibleCount), [visibleHistory, visibleCount]);

  const daysSinceLastActive = useMemo(() => {
    const last = supplierData.lastActivity || supplierData.last_activity;
    if (!last) return null;
    const days = Math.floor((new Date() - new Date(last)) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }, [supplierData]);

  // ==========================================
  // HANDLERS (all guarded)
  // ==========================================
  const handleRecordPurchase = () => {
    if (blockIfReadOnly()) return;
    setPrefillTransaction({ supplierId: supplierData.id, name: supplierData.name, phone: supplierData.phone, type: "purchase", amount: "", paid: "0" });
    setView("recordSupplierPurchase");
  };

  const handleMakePayment = () => {
    if (blockIfReadOnly()) return;
    setPrefillTransaction({ supplierId: supplierData.id, name: supplierData.name, phone: supplierData.phone });
    setView("recordSupplierPayment");
  };

  const handleShareAccount = async (shareData) => {
    try {
      const reference = AccountShareService.generateShareReference();
      await AccountShareService.logShare({
        storeId: currentStore.id,
        contactId: supplierData.id,
        channel: shareData.channel,
        scope: shareData.scope,
        reference
      });
      showToast("✅ Account shared successfully");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to log share event");
    }
  };

  const handleFixTransaction = (tx) => {
    if (blockIfReadOnly()) return;
    setTxToFix(tx);
    setFixReason("");
    setShowFixModal(true);
  };

  const confirmFix = () => {
    setFixTransaction({ ...txToFix, fixReason: fixReason });
    setShowFixModal(false);
    setViewingTransaction(null);
    setView('recordSupplierPurchase');
  };

  const handleCancelTransaction = (tx) => {
    if (blockIfReadOnly()) return;
    setCancelReason("");
    setShowCancelModal(true);
  };

  const executeCancelTransaction = async () => {
    if (!cancelReason.trim()) { showToast("⚠️ Please provide a reason."); return; }
    setShowCancelModal(false);
    try {
      await TransactionService.cancelTransaction(viewingTransaction.id, cancelReason);
      const updatedHistory = await TransactionService.getHistory(supplierData.id);
      let bal = 0;
      (Array.isArray(updatedHistory) ? updatedHistory : []).forEach(t => {
        if (!isActive(t)) return;
        const amt = parseFloat(t.amount) || 0;
        const pd = parseFloat(t.paid) || 0;
        if (t.type === 'purchase') bal += amt - pd;
        else if (t.type === 'supplier_payment') bal -= pd;
      });
      await SupplierService.updateBalance(supplierData.id, bal);
      const updated = await SupplierService.getById(supplierData.id);
      setSupplierData(updated);
      setHistory(normalizeList(updatedHistory));
      setViewingTransaction(null);
      showToast("✅ Transaction cancelled!");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to cancel.");
    }
    setCancelReason("");
  };

  const toggleOldReceipt = async (tx) => {
    if (expandedOldTx && expandedOldTx.id === tx.correctsTransactionId) {
      setExpandedOldTx(null);
    } else {
      const oldTx = await TransactionService.getById(tx.correctsTransactionId);
      setExpandedOldTx(normalizeList([oldTx])[0]);
    }
  };

  const handleDeleteSupplier = async () => {
    if (blockIfReadOnly()) return;
    try {
      await SupplierService.delete(supplierData.id);
      showToast(`🗑️ ${supplierData.name} deleted`);
      setSelectedSupplier(null);
      setView("suppliers");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to delete supplier");
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Supplier Profile" showBack={true} onBack={() => { setView("suppliers"); setSelectedSupplier(null); }} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-5">
        <SupplierHeader supplier={supplierData} daysSinceLastActive={daysSinceLastActive} onEdit={() => { if (!blockIfReadOnly()) setIsEditModalOpen(true); }} />
        <BalanceCard balance={trueBalance} lastPayment={lastPayment} currency={currency} />
        <QuickActions
          onPurchase={handleRecordPurchase}
          onPayment={handleMakePayment}
          onCall={() => openDialer(supplierData.phone)}
          onShare={() => setShowShareModal(true)}
        />
        <OutstandingInvoices invoices={outstandingInvoices} onView={setViewingTransaction} currency={currency} />
        <TransactionHistory
          history={pagedHistory}
          onView={setViewingTransaction}
          onToggleOld={toggleOldReceipt}
          expandedOldTx={expandedOldTx}
          setViewingTransaction={setViewingTransaction}
          currency={currency}
          hasMore={visibleHistory.length > visibleCount}
          onLoadMore={() => setVisibleCount(c => c + 10)}
          shownCount={pagedHistory.length}
          totalCount={visibleHistory.length}
        />
        <MoreInformation totalPurchases={totalPurchases} totalPayments={totalPayments} historyLength={visibleHistory.length} createdAt={supplierData.created_at || supplierData.createdAt} currency={currency} />

        <div className="pt-2">
          <button
            onClick={() => { if (!blockIfReadOnly()) setShowDeleteModal(true); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-95 transition"
          >
            <Trash2 size={16} /> Delete this supplier
          </button>
        </div>
      </div>

      {!showFixModal && !showCancelModal && (
        <ReceiptModal
          tx={viewingTransaction}
          supplier={supplierData}
          currentStore={currentStore}
          onClose={() => setViewingTransaction(null)}
          onFix={handleFixTransaction}
          onCancel={handleCancelTransaction}
          currency={currency}
          history={history}
          allocations={allocations}
        />
      )}
      <FixReasonModal isOpen={showFixModal} onClose={() => setShowFixModal(false)} onConfirm={confirmFix} fixReason={fixReason} setFixReason={setFixReason} />
      <CancelModal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={executeCancelTransaction} cancelReason={cancelReason} setCancelReason={setCancelReason} type={viewingTransaction?.type} />
      <ShareAccountModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        contact={supplierData}
        transactions={history}
        store={currentStore}
        onShared={handleShareAccount}
      />
      <AddSupplierModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        supplier={supplierData}
        onSaved={() => {
          SupplierService.getById(supplierData.id).then(setSupplierData);
        }}
      />
      <DeleteContactModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteSupplier}
        contact={supplierData}
        type="supplier"
        transactions={history}
        currency={currency}
      />
    </div>
  );
};