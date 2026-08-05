import { Check } from "lucide-react";
import { formatCurrency } from "../../utils/helpers";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const FinancialSummaryCard = ({
  totalAmount,
  amountPaid,
  onAmountPaidChange,
  note,
  onNoteChange,
  onSave,
  itemCount,
  currency
}) => {
  const paidToday = parseFloat(amountPaid) || 0;
  const remainingBalance = Math.max(0, totalAmount - paidToday);

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 dark:from-indigo-900 dark:to-indigo-950 p-5 rounded-2xl shadow-lg text-white space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs font-bold uppercase tracking-wider opacity-80">Step 3: Payment</span>
        <span className="text-xs opacity-70">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Purchase Total */}
      <div className="bg-white/10 rounded-xl p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">Purchase Total</p>
        <p className="text-2xl font-bold">{formatCurrency(totalAmount, currency)}</p>
      </div>

      {/* Paid Today */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1 block">Paid Today</label>
        <input
          type="number"
          inputMode="decimal"
          value={amountPaid}
          onChange={onAmountPaidChange}
          placeholder="0.00"
          className={`w-full text-2xl font-bold bg-white/10 border border-white/20 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-white/50 placeholder-white/40 ${noSpinnerClass}`}
        />
      </div>

      {/* Divider + Remaining */}
      <div className="border-t border-white/20 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">
          {remainingBalance > 0 ? "Amount You Still Owe" : remainingBalance === 0 && totalAmount > 0 ? "Fully Paid" : "Amount You Still Owe"}
        </p>
        <p className={`text-3xl font-bold ${remainingBalance > 0 ? 'text-yellow-300' : 'text-green-300'}`}>
          {formatCurrency(remainingBalance, currency)}
        </p>
        {remainingBalance === 0 && totalAmount > 0 && (
          <p className="text-xs opacity-80 mt-1 flex items-center gap-1">
            <Check size={12} /> All settled!
          </p>
        )}
      </div>

      {/* Note */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1 block">
          Optional Note
        </label>
        <textarea
          value={note}
          onChange={onNoteChange}
          placeholder="e.g., Paid by bank transfer, Will pay remaining Friday..."
          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:ring-2 focus:ring-white/50 text-white placeholder-white/50 text-sm resize-none"
          rows="2"
        />
      </div>

      {/* Save Button */}
      <button
        onClick={onSave}
        className="w-full bg-white text-indigo-700 hover:bg-gray-100 font-bold py-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg text-base"
      >
        <Check size={22} /> Save Purchase
      </button>
    </div>
  );
};