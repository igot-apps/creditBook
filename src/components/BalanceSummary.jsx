import { formatCurrency } from "../utils/helpers";

// Compact top-of-profile summary. Unpaid invoices and credit stay separate: credit only
// reduces an invoice when it is actually applied, so both figures are shown as they are.
export function BalanceSummary({ unpaidInvoices = 0, availableCredit = 0, plannedCredit = 0, currency, isSupplier = false, children }) {
  const net = unpaidInvoices - availableCredit;
  const state = net > 0.009 ? "owe" : net < -0.009 ? "credit" : "settled";
  const text = isSupplier
    ? { unpaidHint: "Money you owe", creditHint: "Money held by supplier", owe: "You owe supplier", credit: "Supplier holds your credit" }
    : { unpaidHint: "Money customer owes you", creditHint: "Customer's money you hold", owe: "Customer owes you", credit: "You hold customer's credit" };
  const tone = state === "owe" ? "text-orange-600 dark:text-orange-400" : state === "credit" ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400";

  return (
    <section aria-label={isSupplier ? "Supplier balance" : "Customer balance"} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{isSupplier ? "Supplier balance" : "Customer balance"}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-orange-50 p-3 dark:bg-orange-900/10">
          <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Total unpaid invoices</p>
          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatCurrency(unpaidInvoices, currency)}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">{text.unpaidHint}</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-900/10">
          <p className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Available credit</p>
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(availableCredit, currency)}</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">{text.creditHint}</p>
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Net position</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{state === "owe" ? text.owe : state === "credit" ? text.credit : "All settled"}</p>
        </div>
        <p className={`text-2xl font-black ${tone}`}>{formatCurrency(Math.abs(net), currency)}{state === "credit" ? " credit" : ""}</p>
      </div>
      {state === "credit" && unpaidInvoices > 0.009 && (
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">The unpaid invoices stay unpaid until credit is applied to them.</p>
      )}
      {plannedCredit > 0.009 && availableCredit > 0.009 && (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[11px] font-medium text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {formatCurrency(Math.min(plannedCredit, availableCredit), currency)} of this credit is planned for a suspended {isSupplier ? "purchase" : "sale"}. It is not used until that invoice is saved.
        </p>
      )}
      {children}
    </section>
  );
}
