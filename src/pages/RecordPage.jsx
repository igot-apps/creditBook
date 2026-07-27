import { useState } from "react";
import { Mic, Check, MessageSquare, AlertCircle } from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { formatDate } from "../utils/helpers";
import { CustomerService } from "../services/CustomerService";
import { PageHeader } from "../components/PageHeader";

export const RecordPage = () => {
  const { currentStore, customers, refreshCustomers, showToast, triggerConfetti, setView } = useApp();
  const [tx, setTx] = useState({ customerId: null, name: "", phone: "", items: "", amount: "", paid: "" });
  const [isListening, setIsListening] = useState(false);

  const currentBal = tx.customerId ? (customers.find(c => c.id === tx.customerId)?.balance || 0) : 0;
  const amountVal = parseFloat(tx.amount) || 0;
  const paidVal = parseFloat(tx.paid) || 0;
  const totalDue = currentBal + amountVal;
  const newBal = totalDue - paidVal;
  const isOverpayment = paidVal > totalDue && totalDue > 0;

  const simulateVoice = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      setTx(prev => ({ ...prev, name: "Akosua Mensah", phone: "024 123 4567", items: "2 bags rice, 1 tin oil", amount: "250", paid: "100" }));
    }, 1500);
  };

  const saveTransaction = async () => {
    const amount = parseFloat(tx.amount) || 0;
    const paid = parseFloat(tx.paid) || 0;
    if (amount === 0 && paid === 0) return;

    try {
      await CustomerService.addTransaction(
        currentStore.id, // 👈 SaaS: pass storeId
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
      showToast("Failed to save");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <PageHeader title="Record Sale" onBack={() => setView("home")} />

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        <button onClick={simulateVoice} disabled={isListening} className="w-full bg-yellow-400 text-gray-900 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-md active:scale-95 transition-transform">
          <Mic className={isListening ? "animate-pulse" : ""} size={24} />
          {isListening ? "Listening..." : "Tap mic to simulate voice entry"}
        </button>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
          <input placeholder="Customer Name" value={tx.name} onChange={e => setTx({...tx, name: e.target.value})} className="w-full text-lg font-semibold border-b border-gray-200 dark:border-gray-700 pb-2 outline-none focus:border-green-600 dark:text-white bg-transparent" />
          <input placeholder="Phone Number (024...)" value={tx.phone} onChange={e => setTx({...tx, phone: e.target.value})} className="w-full text-lg text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 outline-none focus:border-green-600 bg-transparent" />
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          <div>
            <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Items Bought (Optional)</label>
            <input placeholder="e.g., Rice, Oil, Cloth" value={tx.items} onChange={e => setTx({...tx, items: e.target.value})} className="w-full text-lg mt-1 outline-none dark:text-white bg-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Total Amount</label>
              <input type="number" placeholder="0.00" value={tx.amount} onChange={e => setTx({...tx, amount: e.target.value})} className="w-full text-2xl font-bold text-gray-900 dark:text-white mt-1 outline-none bg-transparent" />
            </div>
            <div>
              <label className="text-gray-500 dark:text-gray-400 text-sm font-semibold uppercase">Amount Paid</label>
              <input type="number" placeholder="0.00" value={tx.paid} onChange={e => setTx({...tx, paid: e.target.value})} className="w-full text-2xl font-bold text-green-700 dark:text-green-400 mt-1 outline-none bg-transparent" />
            </div>
          </div>
        </div>

        {isOverpayment && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Overpayment Detected</p>
              <p className="text-sm mt-1">
                This creates a <span className="font-bold">credit of GHS {Math.abs(newBal).toFixed(2)}</span>.
              </p>
            </div>
          </div>
        )}

        {(amountVal > 0 || paidVal > 0) && (
          <div className="bg-gray-900 text-gray-100 p-5 rounded-2xl shadow-xl relative">
            <div className="absolute top-3 right-3 bg-green-600 text-white text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1">
              <MessageSquare size={12} /> Message Preview
            </div>
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Message to {tx.name || "Customer"}:</p>
            <div className="font-mono text-sm leading-relaxed whitespace-pre-line">
              {`Balance update (${formatDate(new Date())}):\n`}
              {currentBal > 0 && `Old debt: GHS ${currentBal.toFixed(2)}\n`}
              {tx.items && amountVal > 0 && `Items: ${tx.items}\n`}
              {amountVal > 0 && `New Purchase: GHS ${amountVal.toFixed(2)}\n`}
              {paidVal > 0 && `Paid: GHS ${paidVal.toFixed(2)}\n`}
              {newBal < 0 
                ? `New Balance: GHS 0.00\n(Credit: GHS ${Math.abs(newBal).toFixed(2)})`
                : `New Balance: GHS ${newBal.toFixed(2)}`}
              {`\nThank you! - ${currentStore?.name || "Store"}`}
            </div>
          </div>
        )}

        <button onClick={saveTransaction} disabled={!tx.amount && !tx.paid} className="w-full bg-green-700 text-white font-bold text-xl py-4 rounded-2xl shadow-lg disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2">
          <Check size={24} /> Save Transaction
        </button>
      </div>
    </div>
  );
};