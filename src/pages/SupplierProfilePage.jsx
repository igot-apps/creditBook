import { useState, useEffect, useMemo } from "react";
import { Phone, MessageCircle, Edit3, Ban, Clock, AlertTriangle, FileText, X, Check, ArrowRight, ChevronDown, ChevronUp, Plus, Star, Banknote, Smartphone, CreditCard, Share2, Truck } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { openWhatsApp, openDialer } from "../utils/communication";
import { SupplierService } from "../services/SupplierService";
import { TransactionService } from "../services/TransactionService";
import { AccountShareService } from "../services/AccountShareService";
import { ShareAccountModal } from "../components/ShareAccountModal";
import { AddSupplierModal } from "../components/supplier/AddSupplierModal"; // 👈 NEW: Import Edit Modal
import { TopBar } from "../components/TopBar";

// ==========================================
// SUB-COMPONENTS
// ==========================================

// 👇 UPDATED: Added onEdit prop and Edit button
const SupplierHeader = ({ supplier, daysSinceLastActive, onEdit }) => (
  <div className="flex items-center gap-4">
    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
      {supplier.name.charAt(0)}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{supplier.name}</h2>
        <button onClick={onEdit} className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition" title="Edit Supplier">
          <Edit3 size={14} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
        <Phone size={12} /> {supplier.phone || "No phone"}
      </p>
      {daysSinceLastActive && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
          <Clock size={10} /> Last active: {daysSinceLastActive}
        </p>
      )}
    </div>
  </div>
);

const BalanceCard = ({ balance, lastPayment, currency }) => (
  <div className={`p-5 rounded-2xl shadow-sm border ${
    balance > 0 ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800" : 
    balance < 0 ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" : 
    "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
  }`}>
    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
      {balance > 0 ? "Outstanding Debt" : balance < 0 ? "Supplier Credit" : "All Paid Up"}
    </p>
    <p className={`text-3xl font-bold ${
      balance > 0 ? "text-orange-600 dark:text-orange-400" : 
      balance < 0 ? "text-blue-600 dark:text-blue-400" : 
      "text-green-600 dark:text-green-400"
    }`}>
      {formatCurrency(Math.abs(balance), currency)}
    </p>
    
    {lastPayment && (
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50 flex justify-between items-center text-xs">
        <span className="text-gray-500 dark:text-gray-400">Last payment:</span>
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatCurrency(lastPayment.paid, currency)} on {formatDate(lastPayment.date || lastPayment.createdAt).split(',')[0]}
        </span>
      </div>
    )}
  </div>
);

const QuickActions = ({ onPurchase, onPayment, onCall, onShare }) => (
  <div className="grid grid-cols-4 gap-2">
    <button onClick={onPurchase} className="bg-indigo-600 text-white p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition shadow-md">
      <Plus size={20} /> <span className="text-[10px] font-bold">Purchase</span>
    </button>
    <button onClick={onPayment} className="bg-blue-600 text-white p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition shadow-md">
      <Banknote size={20} /> <span className="text-[10px] font-bold">Payment</span>
    </button>
    <button onClick={onCall} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition">
      <Phone size={20} /> <span className="text-[10px] font-bold">Call</span>
    </button>
    <button onClick={onShare} className="bg-purple-600 text-white p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition shadow-md">
      <Share2 size={20} /> <span className="text-[10px] font-bold">Share</span>
    </button>
  </div>
);

const OutstandingPurchases = ({ purchases, onView, currency }) => {
  if (purchases.length === 0) return null;
  return (
    <div>
      <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-1">
        <AlertTriangle size={12} className="text-orange-500" /> Unpaid Purchases ({purchases.length})
      </h3>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
        {purchases.map(tx => (
          <button key={tx.id} onClick={() => onView(tx)} className="w-full flex items-center justify-between p-3 active:bg-gray-50 dark:active:bg-gray-700/50 transition text-left">
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(tx.trueOutstanding, currency)} unpaid</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatDate(tx.date || tx.createdAt).split(',')[0]}</p>
            </div>
            <ArrowRight size={16} className="text-gray-400" />
          </button>
        ))}
      </div>
    </div>
  );
};

const TransactionHistory = ({ history, onView, onToggleOld, expandedOldTx, setViewingTransaction, currency }) => {
  const visibleHistory = history.filter(tx => !tx.replacedByTransactionId);
  
  const getTimelineIcon = (tx) => {
    if (tx.status === 'being_corrected') return <Edit3 size={16} className="text-yellow-600" />;
    if (tx.status === 'cancelled') return <Ban size={16} className="text-red-500" />;
    if (tx.type === 'supplier_payment') return <Check size={16} className="text-green-500" />;
    return <FileText size={16} className="text-indigo-500" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <Clock size={18} /> Recent Activity
      </div>
      <div className="p-4 space-y-3">
        {visibleHistory.length === 0 ? (
          <p className="text-center text-gray-400 py-6 text-sm">No transaction history yet</p>
        ) : (
          visibleHistory.slice(0, 10).map((tx) => {
            const isBeingCorrected = tx.status === 'being_corrected';
            const isCancelled = tx.status === 'cancelled';
            const isInvalid = isBeingCorrected || isCancelled;

            return (
              <div key={tx.id} className="space-y-2">
                <button onClick={() => onView(tx)} className={`w-full text-left p-3 rounded-xl border transition-all active:scale-[0.98] ${
                  isCancelled ? 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20' :
                  isBeingCorrected ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20' :
                  'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-full ${isInvalid ? (isCancelled ? 'bg-red-100 dark:bg-red-900/40' : 'bg-yellow-100 dark:bg-yellow-900/40') : (tx.type === 'supplier_payment' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-indigo-100 dark:bg-indigo-900/30')}`}>
                        {getTimelineIcon(tx)}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isInvalid ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                          {tx.type === 'supplier_payment' ? 'Payment' : 'Purchase'}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatDate(tx.date || tx.createdAt).split(',')[0]}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isInvalid ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(tx.amount || tx.paid, currency)}</p>
                      {tx.type === 'purchase' && tx.paid > 0 && !isInvalid && <p className="text-[10px] text-indigo-600 dark:text-indigo-400">Paid: {formatCurrency(tx.paid, currency)}</p>}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                    {tx.correctsTransactionId && (
                      <button onClick={(e) => { e.stopPropagation(); onToggleOld(tx); }} className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1">
                        {expandedOldTx && expandedOldTx.id === tx.correctsTransactionId ? <>Hide Previous <ChevronUp size={10} /></> : <>View Previous <ChevronDown size={10} /></>}
                      </button>
                    )}
                    {tx.replacedByTransactionId && (
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1 ml-auto">
                        Updated Receipt <ArrowRight size={10} />
                      </p>
                    )}
                  </div>
                </button>

                {tx.correctsTransactionId && expandedOldTx && expandedOldTx.id === tx.correctsTransactionId && (
                  <div className="ml-6 pl-3 border-l-2 border-gray-300 dark:border-gray-700">
                    <button onClick={() => setViewingTransaction(expandedOldTx)} className="w-full text-left p-2 rounded-lg bg-red-50/30 dark:bg-red-950/10 text-xs text-red-600 dark:text-red-400">
                      Previous Version (Cancelled) - {formatCurrency(expandedOldTx.amount, currency)}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const MoreInformation = ({ totalPurchases, totalPayments, historyLength, createdAt, currency }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <button onClick={() => setShow(!show)} className="w-full p-4 flex justify-between items-center text-sm font-bold text-gray-700 dark:text-gray-300">
        More Information <ChevronDown size={16} className={`transition-transform ${show ? 'rotate-180' : ''}`} />
      </button>
      {show && (
        <div className="p-4 pt-0 grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Total Purchases</p><p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalPurchases, currency)}</p></div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Total Paid</p><p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPayments, currency)}</p></div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Transactions</p><p className="text-lg font-bold text-gray-900 dark:text-white">{historyLength}</p></div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Supplier Since</p><p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{createdAt ? formatDate(createdAt).split(',')[0] : 'N/A'}</p></div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// MODALS
// ==========================================

const ReceiptModal = ({ tx, onClose, onViewTx, onFix, onCancel, currency, activePayments }) => {
  if (!tx) return null;
  const subsequentPayments = useMemo(() => {
    if (tx.type !== 'purchase' || !activePayments) return [];
    return activePayments
      .filter(p => p.allocations?.some(a => a.transactionId === tx.id))
      .map(p => {
        const alloc = p.allocations.find(a => a.transactionId === tx.id);
        return { id: p.id, date: p.createdAt || p.date, amount: alloc.amount, method: p.paymentMethod || 'Cash', note: p.note };
      });
  }, [tx, activePayments]);
  const totalAllocated = subsequentPayments.reduce((sum, p) => sum + p.amount, 0);
  const trueOutstanding = Math.max(0, (parseFloat(tx.amount) || 0) - (parseFloat(tx.paid) || 0) - totalAllocated);

  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={20} className={tx.type === 'supplier_payment' ? "text-blue-600" : "text-indigo-600"} /> 
            {tx.type === 'supplier_payment' ? "Payment Receipt" : "Purchase Receipt"}
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={18} className="text-gray-600 dark:text-gray-300" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Date</span><span className="font-semibold text-gray-900 dark:text-white">{formatDate(tx.date || tx.createdAt)}</span></div>
            {tx.type === 'supplier_payment' && (
              <>
                <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Method</span><span className="font-semibold text-gray-900 dark:text-white capitalize flex items-center gap-1">
                  {tx.paymentMethod === 'momo' ? <Smartphone size={14} /> : tx.paymentMethod === 'bank' ? <CreditCard size={14} /> : <Banknote size={14} />}
                  {tx.paymentMethod || 'Cash'}
                </span></div>
                {tx.reference && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Reference</span><span className="font-mono text-xs font-semibold text-gray-900 dark:text-white break-all text-right">{tx.reference}</span></div>}
              </>
            )}
            <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-2"></div>
            {tx.type === 'supplier_payment' ? (
              <div className="flex justify-between text-lg font-bold"><span className="text-gray-700 dark:text-gray-300">Amount Paid</span><span className="text-green-600 dark:text-green-400">{formatCurrency(tx.paid, currency)}</span></div>
            ) : (
              <>
                <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Total Purchase</span><span className="font-bold text-gray-900 dark:text-white">{formatCurrency(tx.amount, currency)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Paid Upfront</span><span className="font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(tx.paid, currency)}</span></div>
                {subsequentPayments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">Subsequent Payments</p>
                    {subsequentPayments.map(p => (
                      <div key={p.id} className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500 dark:text-gray-400">{formatDate(p.date).split(',')[0]} ({p.method})</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(p.amount, currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-2"></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Total Paid</span><span className="font-bold text-green-600 dark:text-green-400">{formatCurrency((parseFloat(tx.paid)||0) + totalAllocated, currency)}</span></div>
                <div className="flex justify-between text-sm mt-1"><span className="text-gray-500 dark:text-gray-400 font-bold">Outstanding</span><span className={`font-bold ${trueOutstanding > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(trueOutstanding, currency)}</span></div>
              </>
            )}
          </div>
          {tx.status === 'active' && (
            <div className="pt-2 space-y-2">
              <button onClick={() => onFix(tx)} className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"><Edit3 size={18} /> Fix {tx.type === 'supplier_payment' ? 'Payment' : 'Purchase'}</button>
              <button onClick={() => onCancel(tx)} className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"><Ban size={18} /> Cancel {tx.type === 'supplier_payment' ? 'Payment' : 'Purchase'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FixReasonModal = ({ isOpen, onClose, onConfirm, fixReason, setFixReason }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><Edit3 size={20} className="text-blue-600 dark:text-blue-400" /></div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Reason for Fix</h3>
        </div>
        <textarea value={fixReason} onChange={(e) => setFixReason(e.target.value)} placeholder="e.g., Recorded wrong amount..." className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white mb-4 text-sm" rows="3" autoFocus />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl active:scale-95 transition">Continue</button>
        </div>
      </div>
    </div>
  );
};

const CancelModal = ({ isOpen, onClose, onConfirm, cancelReason, setCancelReason, amount, currency, type }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><AlertTriangle size={20} className="text-red-600 dark:text-red-400" /></div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Cancel {type === 'supplier_payment' ? 'Payment' : 'Transaction'}?</h3>
        </div>
        <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason..." className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 dark:text-white mb-4 text-sm" rows="3" autoFocus />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Go Back</button>
          <button onClick={onConfirm} disabled={!cancelReason.trim()} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 active:scale-95 transition">Yes, Cancel</button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN PAGE COMPONENT
// ==========================================

export const SupplierProfilePage = () => {
  const { currentStore, selectedSupplier, setSelectedSupplier, setView, setPrefillTransaction, setFixTransaction, showToast, lastScrollPosition, setLastScrollPosition } = useStore();
  const currency = currentStore?.currency || "GH₵";

  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [supplierData, setSupplierData] = useState(selectedSupplier);
  const [history, setHistory] = useState([]);
  const [expandedOldTx, setExpandedOldTx] = useState(null);
  const [showFixModal, setShowFixModal] = useState(false);
  const [fixReason, setFixReason] = useState("");
  const [txToFix, setTxToFix] = useState(null);
  
  // 👇 NEW: Share Account & Edit Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (selectedSupplier?.id) {
      SupplierService.getById(selectedSupplier.id).then(setSupplierData);
      TransactionService.getHistory(selectedSupplier.id).then(setHistory);
    }
  }, [selectedSupplier?.id]);

  if (!supplierData) return null;

  // ==========================================
  // SINGLE SOURCE OF TRUTH CALCULATION
  // ==========================================
  const activePayments = useMemo(() =>
    history.filter(tx => tx.type === 'supplier_payment' && (tx.status === 'active' || !tx.status)),
  [history]);

  const getTrueOutstanding = (purchase) => {
    const allocated = activePayments.reduce((sum, p) => {
      if (p.allocations) {
        const alloc = p.allocations.find(a => a.transactionId === purchase.id);
        return sum + (alloc ? alloc.amount : 0);
      }
      return sum;
    }, 0);
    return Math.max(0, (parseFloat(purchase.amount) || 0) - (parseFloat(purchase.paid) || 0) - allocated);
  };

  const lastPayment = useMemo(() => history.find(tx => tx.paid > 0 && (tx.status === 'active' || !tx.status)), [history]);
  
  const outstandingPurchases = useMemo(() => 
    history
      .filter(tx => tx.type === 'purchase' && getTrueOutstanding(tx) > 0 && (tx.status === 'active' || !tx.status))
      .map(tx => ({ ...tx, trueOutstanding: getTrueOutstanding(tx) })),
  [history, activePayments]);

  const trueBalance = useMemo(() => {
    const totalPurchases = history
      .filter(t => t.type === 'purchase' && (t.status === 'active' || !t.status))
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      
    const totalUpfront = history
      .filter(t => t.type === 'purchase' && (t.status === 'active' || !t.status))
      .reduce((sum, t) => sum + (parseFloat(t.paid) || 0), 0);
      
    const totalPayments = history
      .filter(t => t.type === 'supplier_payment' && (t.status === 'active' || !t.status))
      .reduce((sum, t) => sum + (parseFloat(t.paid) || 0), 0);
      
    return totalPurchases - totalUpfront - totalPayments;
  }, [history]);

  const totalPurchases = history.reduce((sum, t) => sum + (t.amount > 0 && t.type === 'purchase' && (t.status === 'active' || !t.status) ? t.amount : 0), 0);
  const totalPayments = history.reduce((sum, t) => sum + (t.paid > 0 && (t.status === 'active' || !t.status) ? t.paid : 0), 0);

  const daysSinceLastActive = useMemo(() => {
    if (!supplierData.lastActivity) return null;
    const days = Math.floor((new Date() - new Date(supplierData.lastActivity)) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }, [supplierData.lastActivity]);

  const handleRecordPurchase = () => {
    setPrefillTransaction({ supplierId: supplierData.id, name: supplierData.name, phone: supplierData.phone, type: "purchase", amount: "", paid: "0" });
    setView("recordSupplierPurchase");
  };

  const handleMakePayment = () => {
    setView("recordSupplierPayment");
  };

  const handleShareAccount = async (shareData) => {
    try {
      const reference = AccountShareService.generateShareReference();
      await AccountShareService.logShare({
        storeId: currentStore.id,
        contactId: supplierData.id,
        contactName: supplierData.name,
        channel: shareData.channel,
        scope: shareData.scope,
        reference: reference
      });
      showToast("✅ Account shared successfully");
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to log share event");
    }
  };

  const handleFixTransaction = (tx) => {
    setTxToFix(tx);
    setFixReason("");
    setShowFixModal(true);
  };

  const confirmFix = () => {
    setFixTransaction({ ...txToFix, fixReason: fixReason });
    setShowFixModal(false);
    setView('recordSupplierPurchase'); 
  };

  const handleCancelTransaction = (tx) => {
    setViewingTransaction(tx);
    setShowCancelModal(true);
  };

  const executeCancelTransaction = async () => {
    if (!cancelReason.trim()) { showToast("⚠️ Please provide a reason."); return; }
    setShowCancelModal(false);
    try {
      await TransactionService.cancelTransaction(viewingTransaction.id, cancelReason);
      const updated = await SupplierService.getById(supplierData.id);
      setSupplierData(updated);
      const updatedHistory = await TransactionService.getHistory(supplierData.id);
      setHistory(updatedHistory);
      setViewingTransaction(null);
      showToast("✅ Transaction cancelled!");
    } catch (error) { showToast("❌ Failed to cancel."); }
    setCancelReason("");
  };

  const toggleOldReceipt = async (tx) => {
    if (expandedOldTx && expandedOldTx.id === tx.correctsTransactionId) {
      setExpandedOldTx(null);
    } else {
      const oldTx = await TransactionService.getById(tx.correctsTransactionId);
      setExpandedOldTx(oldTx);
    }
  };

  const generateMessage = (s) => `Hello ${s.name}, this is ${currentStore?.name || "Store"}. I will send your outstanding balance of ${formatCurrency(trueBalance, currency)} by the end of the week. Thank you!`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Supplier Profile" showBack={true} onBack={() => { setView("suppliers"); setSelectedSupplier(null); }} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-5">
        
        {/*  UPDATED: Pass onEdit to SupplierHeader */}
        <SupplierHeader 
          supplier={supplierData} 
          daysSinceLastActive={daysSinceLastActive} 
          onEdit={() => setIsEditModalOpen(true)} 
        />
        
        <BalanceCard balance={trueBalance} lastPayment={lastPayment} currency={currency} />
        
        <QuickActions 
          onPurchase={handleRecordPurchase} 
          onPayment={handleMakePayment} 
          onCall={() => openDialer(supplierData.phone)} 
          onShare={() => setShowShareModal(true)} 
        />
        
        <OutstandingPurchases purchases={outstandingPurchases} onView={setViewingTransaction} currency={currency} />
        <TransactionHistory history={history} onView={setViewingTransaction} onToggleOld={toggleOldReceipt} expandedOldTx={expandedOldTx} setViewingTransaction={setViewingTransaction} currency={currency} />
        <MoreInformation totalPurchases={totalPurchases} totalPayments={totalPayments} historyLength={history.filter(tx => !tx.replacedByTransactionId).length} createdAt={supplierData.createdAt} currency={currency} />

      </div>

      <ReceiptModal 
        tx={viewingTransaction} 
        onClose={() => setViewingTransaction(null)} 
        onViewTx={setViewingTransaction} 
        onFix={handleFixTransaction} 
        onCancel={handleCancelTransaction} 
        currency={currency} 
        activePayments={activePayments} 
      />
      <FixReasonModal isOpen={showFixModal} onClose={() => setShowFixModal(false)} onConfirm={confirmFix} fixReason={fixReason} setFixReason={setFixReason} />
      <CancelModal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={executeCancelTransaction} cancelReason={cancelReason} setCancelReason={setCancelReason} amount={viewingTransaction?.amount || viewingTransaction?.paid} currency={currency} type={viewingTransaction?.type} />
      
      {/* 👇 NEW: Share Account Modal */}
      <ShareAccountModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        contact={supplierData}
        transactions={history}
        store={currentStore}
        onShared={handleShareAccount}
      />

      {/* 👇 NEW: Edit Supplier Modal */}
      <AddSupplierModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        supplier={supplierData} 
        onSaved={() => {
          // Instantly refresh the profile data after editing
          SupplierService.getById(supplierData.id).then(setSupplierData);
          // Also refresh the global suppliers list in the background
          if (currentStore?.id) {
             SupplierService.getAll(currentStore.id).then(updated => {
               useStore.getState().setSuppliers(updated);
             });
          }
        }} 
      />
    </div>
  );
};