import { useState, useEffect, useMemo, useRef } from "react";
import useStore from "../../../store/useStore";
import { CustomerService } from "../../../services/CustomerService";
import { TransactionService } from "../../../services/TransactionService";
import { AllocationService } from "../../../services/AllocationService";
import { AccountShareService } from "../../../services/AccountShareService";

const normalizeTx = (tx) => {
  if (!tx) return tx;
  return {
    ...tx,
    createdAt: tx.created_at || tx.createdAt,
    paymentMethod: tx.payment_method || tx.paymentMethod,
    replacedByTransactionId: tx.replaced_by_transaction_id || tx.replacedByTransactionId,
    correctsTransactionId: tx.corrects_transaction_id || tx.correctsTransactionId,
    contactId: tx.contact_id || tx.contactId,
    contactName: tx.contact_name || tx.contactName,
    contactPhone: tx.contact_phone || tx.contactPhone,
  };
};

const normalizeList = (list) => (Array.isArray(list) ? list : []).map(normalizeTx);
const isActive = (tx) => tx.status === 'active' || !tx.status;
const isWriteOffTx = (tx) => tx.type === 'payment' && (tx.note || '').startsWith('[FORGIVEN]');

export const useCustomerProfile = () => {
  const { 
    currentStore, 
    selectedCustomer, 
    setSelectedCustomer, 
    setView, 
    setPrefillTransaction, 
    setFixTransaction, 
    showToast, 
    readOnly 
  } = useStore();
  
  const currency = currentStore?.currency || "GH₵";
  const [visibleCount, setVisibleCount] = useState(10);

  // Modal states
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

  // View-only guard
  const blockIfReadOnly = () => {
    if (readOnly) {
      showToast(" Subscription expired — please renew to continue.");
      return true;
    }
    return false;
  };

  // Load data
  useEffect(() => {
    if (selectedCustomer?.id) {
      CustomerService.getById(selectedCustomer.id).then(setCustomerData);
      Promise.all([
        TransactionService.getHistory(selectedCustomer.id).then(res => normalizeList(res)).catch(() => []),
        AllocationService.getByContact(selectedCustomer.id).catch(() => []),
      ]).then(([h, a]) => { 
        setHistory(h); 
        setAllocations(a); 
      });
    }
  }, [selectedCustomer?.id]);

  useEffect(() => {
    setVisibleCount(10);
  }, [selectedCustomer?.id]);

  // Auto-heal allocations
  useEffect(() => {
    if (!selectedCustomer?.id || history.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const map = {};
        const activePayIds = new Set(
          history.filter(t => t.type === 'payment' && isActive(t)).map(t => t.id)
        );
        allocations.forEach(a => {
          if (activePayIds.has(a.payment_id) && a.sale_id) {
            map[a.sale_id] = (map[a.sale_id] || 0) + (parseFloat(a.amount) || 0);
          }
        });
        
        const open = history
          .filter(tx => tx.type === 'sale' && isActive(tx) && !tx.replacedByTransactionId)
          .map(tx => ({
            id: tx.id,
            remaining: Math.max(0, (parseFloat(tx.amount) || 0) - (parseFloat(tx.paid) || 0) - (map[tx.id] || 0)),
            date: tx.created_at || tx.createdAt,
          }))
          .filter(x => x.remaining > 0.009)
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        const per = {};
        allocations.forEach(a => {
          if (activePayIds.has(a.payment_id)) {
            per[a.payment_id] = (per[a.payment_id] || 0) + (parseFloat(a.amount) || 0);
          }
        });

        let idx = 0;
        const rows = [];
        history
          .filter(t => t.type === 'payment' && isActive(t))
          .sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt))
          .forEach(p => {
            let avail = (parseFloat(p.paid) || 0) - (per[p.id] || 0);
            if (avail <= 0.009) return;
            while (avail > 0.009 && idx < open.length) {
              const inv = open[idx];
              const apply = Math.min(inv.remaining, avail);
              rows.push({ 
                payment_id: p.id, 
                sale_id: inv.id, 
                contact_id: p.contactId || p.contact_id || null, 
                amount: apply 
              });
              inv.remaining -= apply;
              avail -= apply;
              if (inv.remaining <= 0.009) idx++;
            }
          });

        if (rows.length > 0) {
          await AllocationService.createMany(rows);
          const fresh = await AllocationService.getByContact(selectedCustomer.id);
          if (!cancelled) setAllocations(fresh);
        }
      } catch (error) {
        console.error("Auto-match failed:", error);
      }
    })();
    return () => { cancelled = true; };
  }, [history, allocations, selectedCustomer?.id]);

  if (!customerData) return null;

  // Calculations
  const getTrueOutstanding = (sale) => Math.max(0, (parseFloat(sale.amount) || 0) - (parseFloat(sale.paid) || 0));
  
  const allocationMap = useMemo(() => {
    const map = {};
    const activePayIds = new Set(
      history.filter(t => t.type === 'payment' && isActive(t)).map(t => t.id)
    );
    allocations.forEach(a => {
      if (activePayIds.has(a.payment_id) && a.sale_id) {
        map[a.sale_id] = (map[a.sale_id] || 0) + (parseFloat(a.amount) || 0);
      }
    });
    return map;
  }, [allocations, history]);

  const lastPayment = useMemo(() => {
    const p = history.find(tx => 
      (parseFloat(tx.paid) || 0) > 0 && 
      (tx.type === 'payment' || tx.type === 'sale') && 
      !isWriteOffTx(tx) && 
      isActive(tx)
    );
    return p ? { ...p, date: p.createdAt } : null;
  }, [history]);

  const outstandingInvoices = useMemo(() =>
    history
      .filter(tx => tx.type === 'sale' && isActive(tx) && !tx.replacedByTransactionId)
      .map(tx => {
        const original = getTrueOutstanding(tx);
        const allocated = allocationMap[tx.id] || 0;
        const remaining = Math.max(0, original - allocated);
        return { 
          ...tx, 
          trueOutstanding: remaining, 
          originalOutstanding: original, 
          allocated: original - remaining,
          date: tx.createdAt
        };
      })
      .filter(tx => tx.trueOutstanding > 0),
    [history, allocationMap]
  );

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

  const totalSales = history.reduce((sum, t) => 
    sum + ((parseFloat(t.amount) || 0) > 0 && t.type === 'sale' && isActive(t) ? (parseFloat(t.amount) || 0) : 0), 0
  );
  
  const totalPayments = history.reduce((sum, t) => 
    sum + ((parseFloat(t.paid) || 0) > 0 && !isWriteOffTx(t) && isActive(t) ? (parseFloat(t.paid) || 0) : 0), 0
  );

  const visibleHistory = useMemo(() => 
    history.filter(tx => !tx.replacedByTransactionId), [history]
  );
  
  const pagedHistory = useMemo(() => 
    visibleHistory.slice(0, visibleCount), [visibleHistory, visibleCount]
  );

  const daysSinceLastActive = useMemo(() => {
    const last = customerData.lastActivity || customerData.last_activity;
    if (!last) return null;
    const days = Math.floor((new Date() - new Date(last)) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }, [customerData]);

  // Handlers
  const handleRecordSale = () => {
    if (blockIfReadOnly()) return;
    setPrefillTransaction({ 
      customerId: customerData.id, 
      name: customerData.name, 
      phone: customerData.phone, 
      amount: "", 
      paid: "0" 
    });
    setView("record");
  };

  const handleReceivePayment = () => {
    if (blockIfReadOnly()) return;
    setPrefillTransaction({ 
      customerId: customerData.id, 
      name: customerData.name, 
      phone: customerData.phone 
    });
    setView("recordPayment");
  };

  const handleShareAccount = async (shareData) => {
    try {
      const reference = AccountShareService.generateShareReference();
      await AccountShareService.logShare({
        storeId: currentStore.id,
        contactId: customerData.id,
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
    setView(txToFix.type === 'payment' ? 'recordPayment' : 'record');
  };

  const handleCancelTransaction = (tx) => {
    if (blockIfReadOnly()) return;
    setCancelReason("");
    setShowCancelModal(true);
  };

  const executeCancelTransaction = async () => {
    if (!cancelReason.trim()) { 
      showToast("⚠️ Please provide a reason."); 
      return; 
    }
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
      setCustomerData(updated);
      setHistory(normalizeList(updatedHistory));
      setViewingTransaction(null);
      showToast("✅ Transaction cancelled!");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to cancel.");
    }
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
      setCustomerData(updated);
      setHistory(normalizeList(updatedHistory));
      setShowForgiveModal(false);
      showToast(` ${formatCurrency(amount, currency)} of debt forgiven`);
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to forgive debt");
      throw error;
    }
  };

  const toggleOldReceipt = async (tx) => {
    if (expandedOldTx && expandedOldTx.id === tx.correctsTransactionId) {
      setExpandedOldTx(null);
    } else {
      const oldTx = await TransactionService.getById(tx.correctsTransactionId);
      setExpandedOldTx(normalizeTx(oldTx));
    }
  };

  const handleDeleteCustomer = async () => {
    if (blockIfReadOnly()) return;
    try {
      await CustomerService.delete(customerData.id);
      showToast(`️ ${customerData.name} deleted`);
      setSelectedCustomer(null);
      setView("customers");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to delete customer");
      throw error;
    }
  };

  return {
    // Data
    customerData,
    history: pagedHistory,
    allocations,
    visibleHistory,
    outstandingInvoices,
    trueBalance,
    totalSales,
    totalPayments,
    daysSinceLastActive,
    lastPayment,
    currency,
    visibleCount,
    
    // Modals
    viewingTransaction,
    showCancelModal,
    cancelReason,
    expandedOldTx,
    showFixModal,
    fixReason,
    showShareModal,
    isEditModalOpen,
    showDeleteModal,
    showForgiveModal,
    
    // Setters
    setViewingTransaction,
    setShowCancelModal,
    setCancelReason,
    setExpandedOldTx,
    setShowFixModal,
    setFixReason,
    setShowShareModal,
    setIsEditModalOpen,
    setShowDeleteModal,
    setShowForgiveModal,
    setVisibleCount,
    
    // Handlers
    handleRecordSale,
    handleReceivePayment,
    handleShareAccount,
    handleFixTransaction,
    confirmFix,
    handleCancelTransaction,
    executeCancelTransaction,
    executeForgiveDebt,
    toggleOldReceipt,
    handleDeleteCustomer,
    blockIfReadOnly,
  };
};