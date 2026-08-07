import { useState, useEffect, useMemo } from "react";
import { Phone, MessageCircle, Edit3, Ban, Clock, AlertTriangle, FileText, X, Check, ArrowRight, ArrowLeft, ChevronDown, ChevronUp, Plus, Star, Banknote } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";
import { openWhatsApp, openDialer } from "../utils/communication";
import { CustomerService } from "../services/CustomerService";
import { TransactionService } from "../services/TransactionService";
import { TopBar } from "../components/TopBar";

// ==========================================
// SUB-COMPONENTS
// ==========================================

const CustomerHeader = ({ customer, daysSinceLastActive }) => (
  <div className="flex items-center gap-4">
    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
      {customer.name.charAt(0)}
    </div>
    <div className="flex-1 min-w-0">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{customer.name}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
        <Phone size={12} /> {customer.phone || "No phone"}
      </p>
      {daysSinceLastActive && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
          <Clock size={10} /> Last active: {daysSinceLastActive}
        </p>
      )}
    </div>
  </div>
);

const BalanceCard = ({ customer, lastPayment, currency }) => (
  <div className={`p-5 rounded-2xl shadow-sm border ${
    customer.balance > 0 ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800" : 
    customer.balance < 0 ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" : 
    "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
  }`}>
    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
      {customer.balance > 0 ? "Outstanding Balance" : customer.balance < 0 ? "Customer Credit" : "All Paid Up"}
    </p>
    <p className={`text-3xl font-bold ${
      customer.balance > 0 ? "text-orange-600 dark:text-orange-400" : 
      customer.balance < 0 ? "text-blue-600 dark:text-blue-400" : 
      "text-green-600 dark:text-green-400"
    }`}>
      {formatCurrency(Math.abs(customer.balance), currency)}
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

const QuickActions = ({ onSale, onPayment, onCall, onWhatsApp }) => (
  <div className="grid grid-cols-4 gap-2">
    <button onClick={onSale} className="bg-green-600 text-white p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition shadow-md">
      <Plus size={20} /> <span className="text-[10px] font-bold">Sale</span>
    </button>
    <button onClick={onPayment} className="bg-blue-600 text-white p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition shadow-md">
      <Banknote size={20} /> <span className="text-[10px] font-bold">Payment</span>
    </button>
    <button onClick={onCall} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition">
      <Phone size={20} /> <span className="text-[10px] font-bold">Call</span>
    </button>
    <button onClick={onWhatsApp} className="bg-green-500 text-white p-3 rounded-xl flex flex-col items-center gap-1.5 active:scale-95 transition shadow-md">
      <MessageCircle size={20} /> <span className="text-[10px] font-bold">WhatsApp</span>
    </button>
  </div>
);

const OutstandingInvoices = ({ invoices, onView, currency }) => {
  if (invoices.length === 0) return null;
  return (
    <div>
      <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-1">
        <AlertTriangle size={12} className="text-orange-500" /> Unpaid Invoices ({invoices.length})
      </h3>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
        {invoices.map(tx => (
          <button key={tx.id} onClick={() => onView(tx)} className="w-full flex items-center justify-between p-3 active:bg-gray-50 dark:active:bg-gray-700/50 transition text-left">
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">{formatCurrency(tx.amount - tx.paid, currency)} unpaid</p>
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
    if (tx.amount > 0 && tx.paid === 0) return <FileText size={16} className="text-orange-500" />;
    if (tx.amount === 0 && tx.paid > 0) return <Check size={16} className="text-green-500" />;
    return <FileText size={16} className="text-green-500" />;
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
                      <div className={`p-1 rounded-full ${isInvalid ? (isCancelled ? 'bg-red-100 dark:bg-red-900/40' : 'bg-yellow-100 dark:bg-yellow-900/40') : 'bg-green-100 dark:bg-green-900/30'}`}>
                        {getTimelineIcon(tx)}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${isInvalid ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                          {tx.type === 'payment' ? 'Payment' : 'Sale'}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{formatDate(tx.date || tx.createdAt).split(',')[0]}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isInvalid ? 'text-gray-400' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(tx.amount, currency)}</p>
                      {tx.paid > 0 && !isInvalid && <p className="text-[10px] text-green-600 dark:text-green-400">Paid: {formatCurrency(tx.paid, currency)}</p>}
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

const MoreInformation = ({ totalSales, totalPayments, historyLength, createdAt, currency }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <button onClick={() => setShow(!show)} className="w-full p-4 flex justify-between items-center text-sm font-bold text-gray-700 dark:text-gray-300">
        More Information <ChevronDown size={16} className={`transition-transform ${show ? 'rotate-180' : ''}`} />
      </button>
      {show && (
        <div className="p-4 pt-0 grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Total Sales</p><p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalSales, currency)}</p></div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Total Paid</p><p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPayments, currency)}</p></div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Transactions</p><p className="text-lg font-bold text-gray-900 dark:text-white">{historyLength}</p></div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Customer Since</p><p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{createdAt ? formatDate(createdAt).split(',')[0] : 'N/A'}</p></div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// MODALS
// ==========================================

const ReceiptModal = ({ tx, onClose, onViewTx, onFix, onCancel, currency }) => {
  if (!tx) return null;
  return (
    <div className="fixed inset-0 bg-black/60 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2"><FileText size={20} className="text-green-600" /> Sale Receipt</h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"><X size={18} className="text-gray-600 dark:text-gray-300" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-col items-center gap-2">
            {tx.status === 'being_corrected' ? (
              <span className="px-4 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Edit3 size={12} /> Being Corrected</span>
            ) : tx.status === 'cancelled' ? (
              <span className="px-4 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Ban size={12} /> Cancelled</span>
            ) : (
              <span className="px-4 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">Completed</span>
            )}
            <div className="flex justify-between items-center w-full mt-2 px-2">
              {tx.correctsTransactionId && (
                <button onClick={async () => { const original = await TransactionService.getById(tx.correctsTransactionId); onViewTx(original); }} className="text-xs text-blue-600 dark:text-blue-400 underline flex items-center gap-1">
                  <ArrowLeft size={12} /> Previous Version
                </button>
              )}
              {tx.replacedByTransactionId && (
                <button onClick={async () => { const replacement = await TransactionService.getById(tx.replacedByTransactionId); onViewTx(replacement); }} className="text-xs text-blue-600 dark:text-blue-400 underline flex items-center gap-1">
                  Updated Receipt <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>

          {tx.items && tx.items.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">Items ({tx.items.length})</p>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {tx.items.map((item, idx) => (
                    <div key={idx} className={`px-4 py-3 ${tx.status !== 'active' ? 'opacity-60' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className={`font-semibold text-sm text-gray-900 dark:text-white truncate ${tx.status !== 'active' ? 'line-through' : ''}`}>{item.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-wider">{item.unitName || 'Piece'}</p>
                        </div>
                        <p className={`text-base font-bold flex-shrink-0 ${tx.status !== 'active' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(item.total || 0, currency)}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs mt-1">
                        <div className="flex items-center gap-1"><span className="text-gray-500 dark:text-gray-400">Qty:</span><span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded font-bold">{item.quantity || 1}</span></div>
                        <div className="flex items-center gap-1"><span className="text-gray-500 dark:text-gray-400">Price:</span><span className="font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(item.price || 0, currency)}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-3">
            <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Date</span><span className="font-semibold text-gray-900 dark:text-white">{formatDate(tx.date || tx.createdAt)}</span></div>
            <div className="flex justify-between text-sm items-start gap-2">
              <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">Transaction ID</span>
              <span className="font-mono text-xs font-semibold text-gray-900 dark:text-white break-all text-right">{tx.id}</span>
            </div>
            {tx.note && <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Note</span><span className="font-semibold text-gray-900 dark:text-white text-right max-w-[60%] truncate">{tx.note}</span></div>}
            {tx.fixReason && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-[10px] font-bold text-blue-500 uppercase flex items-center gap-1 mb-1"><Edit3 size={10} /> Reason for Fix</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">{tx.fixReason}</p>
              </div>
            )}
            <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-2"></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Total Sale</span><span className={`font-bold ${tx.status !== 'active' ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>{formatCurrency(tx.amount, currency)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">Amount Paid</span><span className={`font-bold ${tx.status !== 'active' ? 'line-through text-gray-400' : 'text-green-600 dark:text-green-400'}`}>{formatCurrency(tx.paid, currency)}</span></div>
          </div>

          {tx.status === 'cancelled' && tx.cancelReason && (
            <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl">
              <p className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1 mb-1"><AlertTriangle size={10} /> Reason for Cancellation</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">{tx.cancelReason}</p>
            </div>
          )}

          {tx.status === 'active' && (
            <div className="pt-2 space-y-2">
              <button onClick={() => onFix(tx)} className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"><Edit3 size={18} /> Fix Sale</button>
              <button onClick={() => onCancel(tx)} className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition"><Ban size={18} /> Cancel Sale</button>
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
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
          Why are you correcting this sale?
          <span className="text-gray-400 text-xs block mt-1">(Optional, but helpful for records)</span>
        </p>
        <textarea 
          value={fixReason} 
          onChange={(e) => setFixReason(e.target.value)} 
          placeholder="e.g., Customer said quantity was wrong..." 
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-white mb-4 text-sm" 
          rows="3" 
          autoFocus 
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl active:scale-95 transition">Continue</button>
        </div>
      </div>
    </div>
  );
};

const CancelModal = ({ isOpen, onClose, onConfirm, cancelReason, setCancelReason, amount, currency }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full"><AlertTriangle size={20} className="text-red-600 dark:text-red-400" /></div>
          <h3 className="font-bold text-xl text-gray-900 dark:text-white">Cancel Sale?</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">This will cancel the <span className="font-bold text-orange-600">{formatCurrency(amount, currency)}</span> sale and remove it from the balance.</p>
        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Reason *</label>
        <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g., Recorded wrong amount..." className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 dark:text-white mb-4 text-sm" rows="3" autoFocus />
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

export const ProfilePage = () => {
  const { currentStore, selectedCustomer, setSelectedCustomer, setView, setPrefillTransaction, setFixTransaction, showToast, lastScrollPosition, setLastScrollPosition } = useStore();
  const currency = currentStore?.currency || "GH₵";

  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [customerData, setCustomerData] = useState(selectedCustomer);
  const [history, setHistory] = useState([]);
  const [expandedOldTx, setExpandedOldTx] = useState(null);
  
  // Fix Modal State
  const [showFixModal, setShowFixModal] = useState(false);
  const [fixReason, setFixReason] = useState("");
  const [txToFix, setTxToFix] = useState(null);

  useEffect(() => {
    if (selectedCustomer?.id) {
      CustomerService.getById(selectedCustomer.id).then(setCustomerData);
      TransactionService.getHistory(selectedCustomer.id).then(setHistory);
    }
  }, [selectedCustomer?.id]);

  useEffect(() => {
    if (lastScrollPosition > 0) {
      window.scrollTo(0, lastScrollPosition);
      setLastScrollPosition(0);
    }
  }, [lastScrollPosition, setLastScrollPosition]);

  if (!customerData) return null;

  // Data Calculations
  const lastPayment = useMemo(() => 
    history.find(tx => tx.paid > 0 && (tx.status === 'active' || !tx.status)), 
  [history]);

  const outstandingInvoices = useMemo(() => 
    history.filter(tx => 
      tx.amount > tx.paid && 
      (tx.status === 'active' || !tx.status) // Strictly only active invoices
    ), 
  [history]);

  const totalSales = history.reduce((sum, t) => 
    sum + (t.amount > 0 && (t.status === 'active' || !t.status) ? t.amount : 0), 0
  );
  
  const totalPayments = history.reduce((sum, t) => 
    sum + (t.paid > 0 && (t.status === 'active' || !t.status) ? t.paid : 0), 0
  );

  const daysSinceLastActive = useMemo(() => {
    if (!customerData.lastActivity) return null;
    const days = Math.floor((new Date() - new Date(customerData.lastActivity)) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  }, [customerData.lastActivity]);

  // Actions
  const handleRecordSale = () => {
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

  const handleFixTransaction = (tx) => {
    setTxToFix(tx);
    setFixReason("");
    setShowFixModal(true);
  };

  const confirmFix = () => {
    setFixTransaction({ ...txToFix, fixReason: fixReason });
    setShowFixModal(false);
    setView("record");
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
      const updated = await CustomerService.getById(customerData.id);
      setCustomerData(updated);
      const updatedHistory = await TransactionService.getHistory(customerData.id);
      setHistory(updatedHistory);
      setViewingTransaction(null);
      showToast("✅ Sale cancelled!");
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

  const generateMessage = (c) => `Hello ${c.name}, this is ${currentStore?.name || "Store"}. Please send your outstanding balance of ${formatCurrency(c.balance, currency)} by the end of the week. Thank you!`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Customer Profile" showBack={true} onBack={() => { setView("customers"); setSelectedCustomer(null); }} />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-5">
        
        <CustomerHeader customer={customerData} daysSinceLastActive={daysSinceLastActive} />
        <BalanceCard customer={customerData} lastPayment={lastPayment} currency={currency} />
        
        <QuickActions 
          onSale={handleRecordSale} 
          onPayment={handleReceivePayment} 
          onCall={() => openDialer(customerData.phone)} 
          onWhatsApp={() => openWhatsApp(customerData.phone, generateMessage(customerData))} 
        />
        
        <OutstandingInvoices invoices={outstandingInvoices} onView={setViewingTransaction} currency={currency} />
        <TransactionHistory history={history} onView={setViewingTransaction} onToggleOld={toggleOldReceipt} expandedOldTx={expandedOldTx} setViewingTransaction={setViewingTransaction} currency={currency} />
        <MoreInformation totalSales={totalSales} totalPayments={totalPayments} historyLength={history.filter(tx => !tx.replacedByTransactionId).length} createdAt={customerData.createdAt} currency={currency} />

      </div>

      {/* Modals */}
      <ReceiptModal tx={viewingTransaction} onClose={() => setViewingTransaction(null)} onViewTx={setViewingTransaction} onFix={handleFixTransaction} onCancel={handleCancelTransaction} currency={currency} />
      <FixReasonModal isOpen={showFixModal} onClose={() => setShowFixModal(false)} onConfirm={confirmFix} fixReason={fixReason} setFixReason={setFixReason} />
      <CancelModal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={executeCancelTransaction} cancelReason={cancelReason} setCancelReason={setCancelReason} amount={viewingTransaction?.amount} currency={currency} />
    </div>
  );
};