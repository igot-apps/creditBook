import { useState, useEffect } from "react";
import { Banknote, Smartphone, CreditCard, Check } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { TransactionService } from "../services/TransactionService";
import { SupplierService } from "../services/SupplierService";
import { TopBar } from "../components/TopBar";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const RecordSupplierPaymentPage = () => {
  const { 
    currentStore, 
    selectedSupplier, 
    setView, 
    showToast 
  } = useStore();

  const currency = currentStore?.currency || "GH₵";
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Safety check: if no supplier is selected, go back to suppliers list
  useEffect(() => {
    if (!selectedSupplier) {
      setView("suppliers");
    }
  }, [selectedSupplier, setView]);

  const handleSave = async () => {
    const finalAmount = parseFloat(amount);
    
    if (!finalAmount || finalAmount <= 0) {
      showToast("️ Please enter a valid amount.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Record the payment (FIFO allocation happens invisibly here)
      await TransactionService.recordSupplierPayment(
        currentStore.id,
        selectedSupplier.id,
        finalAmount,
        note,
        { paymentMethod: method }
      );

      // 2. Recalculate the supplier's total balance
      await SupplierService.updateBalance(selectedSupplier.id);

      showToast(`✅ Paid ${formatCurrency(finalAmount, currency)}`);
      
      // 3. Return to the supplier's profile to see the updated balance
      setView("supplierProfile");
      
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to record payment.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedSupplier) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar 
        title="Pay Supplier" 
        showBack={true} 
        onBack={() => setView("supplierProfile")} 
      />
      
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-6">
        
        {/* 1. Supplier Context Card */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-indigo-100 dark:border-indigo-900/30 flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0">
            {selectedSupplier.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-wider">Paying to</p>
            <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{selectedSupplier.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
              Current Debt: <span className="font-bold text-orange-600 dark:text-orange-400">{formatCurrency(selectedSupplier.balance || 0, currency)}</span>
            </p>
          </div>
        </div>

        {/* 2. Massive Amount Input (Auto-focus for numeric keypad) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-center">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 block">Amount to Pay</label>
          <div className="relative flex items-center justify-center">
            <span className="absolute left-1/2 -translate-x-[140px] text-3xl font-bold text-gray-400 dark:text-gray-500">{currency}</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              className={`w-full text-center text-5xl font-bold text-indigo-700 dark:text-indigo-400 outline-none bg-transparent pt-2 pb-1 ${noSpinnerClass}`}
            />
          </div>
        </div>

        {/* 3. Payment Method */}
        <div>
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block px-1">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            <MethodButton icon={Banknote} label="Cash" value="cash" current={method} set={setMethod} />
            <MethodButton icon={Smartphone} label="MoMo" value="momo" current={method} set={setMethod} />
            <MethodButton icon={CreditCard} label="Bank" value="bank" current={method} set={setMethod} />
          </div>
        </div>

        {/* 4. Note (Optional) */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2 block">Note (Optional)</label>
          <textarea 
            value={note} 
            onChange={(e) => setNote(e.target.value)} 
            placeholder="e.g., Paid for last week's delivery..." 
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm resize-none" 
            rows="2" 
          />
        </div>

        {/* 5. Save Button */}
        <button 
          onClick={handleSave} 
          disabled={isSaving || !amount || parseFloat(amount) <= 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg text-lg"
        >
          {isSaving ? (
            "Saving..."
          ) : (
            <>
              <Check size={24} /> Make Payment
            </>
          )}
        </button>

      </div>
    </div>
  );
};

// Helper Component for Method Buttons
const MethodButton = ({ icon: Icon, label, value, current, set }) => (
  <button
    onClick={() => set(value)}
    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
      current === value 
        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" 
        : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-600"
    }`}
  >
    <Icon size={20} strokeWidth={current === value ? 2.5 : 2} />
    <span className="text-xs font-bold">{label}</span>
  </button>
);