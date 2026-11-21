import { formatCurrency, formatDate } from "../../../utils/helpers";
import { txDate } from "../utils/helpers";
import { BalanceSummary } from "../../../components/BalanceSummary";

export const BalanceCard = ({ unpaidInvoices, availableCredit, plannedCredit, lastPayment, currency }) => (
  <BalanceSummary isSupplier unpaidInvoices={unpaidInvoices} availableCredit={availableCredit} plannedCredit={plannedCredit} currency={currency}>
    {lastPayment && (
      <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 text-xs dark:border-gray-700/50">
        <span className="text-gray-500 dark:text-gray-400">Last payment:</span>
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatCurrency(parseFloat(lastPayment.paid) || 0, currency)} on {formatDate(txDate(lastPayment)).split(',')[0]}
        </span>
      </div>
    )}
  </BalanceSummary>
);
