import { useState, useEffect } from "react";
import { Check, MessageSquare, AlertCircle, User } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { formatDate, formatCurrency } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { PageHeader } from "../components/PageHeader";

export const RecordPage = () => {
  const { 
    currentStore, 
    customers, 
    refreshCustomers, 
    showToast, 
    triggerConfetti, 
    setView,
    prefillTransaction,
    setPrefillTransaction
  } = useApp();
  
  const [tx, setTx] = useState({ 
    customerId: null, 
    name: "", 
    phone: "", 
    items: "", 
    amount: "", 
    paid: "" 
  });
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    if (prefillTransaction) {
      setTx(prefillTransaction);
      setPrefillTransaction(null);
    }
  }, [prefillTransaction, setPrefillTransaction]);

  const isExistingCustomer = !!tx.customerId;
  const currentBal = tx.customerId 
    ? (customers.find(c => c.id === tx.customerId)?.balance || 0) 
    : 0;
  const amountVal = parseFloat(tx.amount) || 0;
  const paidVal = parseFloat(tx.paid) || 0;
  const totalDue = currentBal + amountVal;
  const newBal = totalDue - paidVal;
  const isOverpayment = paidVal > totalDue && totalDue > 0;

  const saveTransaction = async () => {
    const amount = parseFloat(tx.amount) || 0;
    const paid = parseFloat(tx.paid) || 0;
    if (amount === 0 && paid === 0) return;

    // Clear previous errors
    setPhoneError("");

    try {
      await CustomerService.addTransaction(
        currentStore.id,
        tx.customerId,
        tx.name,
        tx.phone,
        amount,
        paid,
        tx.items
      );
      await refreshCustomers();
      
      if (newBal === 0 && paid > 0) triggerConfetti();
      
      setTx({ customerId: null, name: "", phone: "", items: "", amount: "", paid: "" });
      setView("home");
      showToast("Transaction saved");
    } catch (error) {
      console.error("Failed to save transaction", error);
      
      // 👇 Handle the specific "already exists" error
      if (error.message.includes("already exists")) {
        setPhoneError(error.message);
        showToast(error.message);
      } else {
        showToast("Failed to save transaction");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Record Sale" onBack={() => setView("home")} />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Customer Section */}
        {isExistingCustomer ? (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold text-lg">
                {tx.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">Recording for</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg">{tx.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{tx.phone}</p>
              </div>
              <button 
                onClick={() => setTx({...tx, customerId: null, name: "", phone: "", items: "", amount: "", paid: ""})} 
                className="text-xs text-red-600 dark:text-red-400 underline font-semibold px-2 py-1"
              >
                Change
              </button>
            </div>
            {currentBal > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Current Debt</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(currentBal)}</p>
              </div>
            )}
            {currentBal < 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Credit Balance</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(Math.abs(currentBal))}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <User size={16} className="text-gray-400" />
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">New Customer</p>
            </div>
            <input 
              placeholder="Customer Name" 
              value={tx.name} 
              onChange={e => { setTx({...tx, name: e.target.value}); setPhoneError(""); }} 
              className="w-full text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-2 outline-none focus:border-green-600 dark:text-white bg-transparent" 
            />
            <div>
              <input 
                placeholder="Phone Number (024...)" 
                value={tx.phone} 
                onChange={e => { setTx({...tx, phone: e.target.value}); setPhoneError(""); }} 
                className={`w-full text-lg border-b pb-2 outline-none focus:border-green-600 bg-transparent ${
                  phoneError ? "text-red-600 dark:text-red-400 border-red-500" : "text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                }`} 
              />
              {phoneError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {phoneError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Transaction Details */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          <div>
            <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Items Bought (Optional)</label>
            <input 
              placeholder="e.g., Rice, Oil, Cloth" 
              value={tx.items} 
              onChange={e => setTx({...tx, items: e.target.value})} 
              className="w-full text-lg mt-1 outline-none dark:text-white bg-transparent" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Total Amount</label>
              <input 
                type="number" 
                placeholder="0.00" 
                value={tx.amount} 
                onChange={e => setTx({...tx, amount: e.target.value})} 
                className="w-full text-2xl font-bold text-gray-900 dark:text-white mt-1 outline-none bg-transparent" 
              />
            </div>
            <div>
              <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Money Paid</label>
              <input 
                type="number" 
                placeholder="0.00" 
                value={tx.paid} 
                onChange={e => setTx({...tx, paid: e.target.value})} 
                className="w-full text-2xl font-bold text-green-700 dark:text-green-400 mt-1 outline-none bg-transparent" 
              />
            </div>
          </div>
        </div>

        {/* Overpayment Warning */}
        {isOverpayment && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Overpayment Detected</p>
              <p className="text-sm mt-1">
                Money paid ({formatCurrency(paidVal)}) is more than the debt ({formatCurrency(totalDue)}). 
                This creates a <span className="font-bold">credit of {formatCurrency(Math.abs(newBal))}</span>.
              </p>
            </div>
          </div>
        )}

        {/* SMS Preview */}
        {(amountVal > 0 || paidVal > 0) && (
          <div className="bg-gray-900 text-gray-100 p-5 rounded-2xl shadow-xl relative">
            <div className="absolute top-3 right-3 bg-green-600 text-white text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1">
              <MessageSquare size={12} /> SMS Preview
            </div>
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Message to {tx.name || "Customer"}:</p>
            <div className="font-mono text-sm leading-relaxed whitespace-pre-line">
              {`Balance update (${formatDate(new Date())}):\n`}
              {`Old debt: ${formatCurrency(currentBal)}\n`}
              {amountVal > 0 && `Items bought: ${formatCurrency(amountVal)}\n`}
              {tx.items && amountVal > 0 && `What was bought: ${tx.items}\n`}
              {paidVal > 0 && `Money paid: ${formatCurrency(paidVal)}\n`}
              {newBal < 0 
                ? `Total debt now: ${formatCurrency(0)}\n(You have a credit of ${formatCurrency(Math.abs(newBal))})`
                : `Total debt now: ${formatCurrency(newBal)}`}
              {`\nThank you! - From ${currentStore?.name || "Store"}`}
            </div>
          </div>
        )}

        {/* Save Button */}
        <button 
          onClick={saveTransaction} 
          disabled={!tx.amount && !tx.paid} 
          className="w-full bg-green-700 text-white font-bold text-xl py-4 rounded-2xl shadow-lg disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <Check size={24} /> Save Transaction
        </button>
      </div>
    </div>
  );
};