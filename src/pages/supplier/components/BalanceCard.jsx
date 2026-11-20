import { formatCurrency, formatDate } from "../../../utils/helpers";
import { txDate } from "../utils/helpers";

export const BalanceCard = ({ balance, unpaidInvoices, availableCredit, lastPayment, currency }) => {
  const hasBreakdown = unpaidInvoices !== undefined && availableCredit !== undefined;
  const unpaid = hasBreakdown ? unpaidInvoices : Math.max(0, balance);
  const credit = hasBreakdown ? availableCredit : Math.max(0, -balance);
  const net = unpaid - credit;
  const netOwed = Math.max(0, net);
  const extraCredit = Math.max(0, -net);
  const state = netOwed > 0.009 ? "owe" : extraCredit > 0.009 ? "credit" : "settled";

  return (
    <div className={`p-4 rounded-2xl shadow-sm border ${
      state === "owe" ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800" :
      state === "credit" ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" :
      "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
    }`}>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/70 dark:bg-gray-900/40 p-3">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Unpaid invoices</p>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(unpaid, currency)}</p>
        </div>
        <div className="rounded-xl bg-white/70 dark:bg-gray-900/40 p-3">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Available credit</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(credit, currency)}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Paid, not yet used</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {state === "settled" ? "All settled" : "Net amount you owe"}
        </p>
        <p className={`text-3xl font-bold ${
          state === "owe" ? "text-orange-600 dark:text-orange-400" :
          state === "credit" ? "text-blue-600 dark:text-blue-400" :
          "text-green-600 dark:text-green-400"
        }`}>
          {formatCurrency(netOwed, currency)}
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          {state === "credit"
            ? `You owe nothing. ${formatCurrency(extraCredit, currency)} credit is left for future purchases.`
            : "Unpaid invoices minus available credit"}
        </p>
      </div>

      {lastPayment && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50 flex justify-between items-center text-xs">
          <span className="text-gray-500 dark:text-gray-400">Last payment:</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(parseFloat(lastPayment.paid) || 0, currency)} on {formatDate(txDate(lastPayment)).split(',')[0]}
          </span>
        </div>
      )}
    </div>
  );
};
