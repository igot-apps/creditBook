import { formatCurrency, formatDate } from "../../../utils/helpers";
import { txDate } from "../utils/helpers";

export const BalanceCard = ({ balance, lastPayment, currency }) => (
  <div className={`p-5 rounded-2xl shadow-sm border ${
    balance > 0 ? "bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800" :
    balance < 0 ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" :
    "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
  }`}>
    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
      {balance > 0 ? "Outstanding Balance" : balance < 0 ? "Customer Credit" : "All Paid Up"}
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
          {formatCurrency(parseFloat(lastPayment.paid) || 0, currency)} on {formatDate(txDate(lastPayment)).split(',')[0]}
        </span>
      </div>
    )}
  </div>
);