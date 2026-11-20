import { Route, RotateCcw } from "lucide-react";
import { formatCurrency, formatDate } from "../utils/helpers";
import { moneyTrail, invoiceFunding, historySummary, txReference, txWhen, cancelledAt, cancelReason, isWriteOff } from "../utils/moneyTrail";

const day = value => (value ? formatDate(value).split(",")[0] : "");
const kindLabel = { payment: "payment", credit: "credit", mixed: "payment + later credit" };

const Ref = ({ tx, onView }) => onView
  ? <button type="button" onClick={() => onView(tx)} className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2 dark:text-indigo-300">{txReference(tx)}</button>
  : <span className="font-semibold">{txReference(tx)}</span>;

/** Chronological trail for a payment (or an overpaid invoice): paid → used → refunded → left. */
export function MoneyTrail({ source, history = [], allocations = [], currency, onView }) {
  if (!source || source.credit_source_id || isWriteOff(source)) return null;
  const { start, steps, left } = moneyTrail(source, history, allocations);
  if (start <= 0.009) return null;
  const isInvoice = source.type === "sale" || source.type === "purchase";
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-3 text-xs dark:border-gray-800 dark:bg-gray-900" aria-label="Money trail">
      <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400"><Route size={11}/> Money trail</p>
      <ol className="space-y-1.5 border-l-2 border-gray-200 pl-3 dark:border-gray-700">
        <li className="flex justify-between gap-3"><span>{day(txWhen(source))} · {isInvoice ? "Extra paid on this invoice" : "Paid"}</span><strong>{formatCurrency(start, currency)}</strong></li>
        {steps.map((step, index) => (
          <li key={index} className="flex justify-between gap-3">
            {step.type === "used" && <span className="min-w-0 break-words">{day(step.at)} · Used on <Ref tx={step.target} onView={onView}/> <span className="text-gray-500">({kindLabel[step.kind]})</span></span>}
            {step.type === "refund" && <span className="min-w-0 break-words">{day(step.at)} · Refunded{step.target.reference ? ` · ref ${step.target.reference}` : ""}</span>}
            {step.type === "returned" && <span className="min-w-0 break-words text-gray-500">{step.at ? `${day(step.at)} · ` : ""}<Ref tx={step.target} onView={onView}/> cancelled{step.reason ? ` (${step.reason})` : ""}: this money became credit again</span>}
            {step.type === "returned" ? <span className="text-gray-400">{formatCurrency(step.amount, currency)}</span> : <strong>−{formatCurrency(step.amount, currency)}</strong>}
          </li>
        ))}
      </ol>
      <p className="mt-2 flex justify-between border-t border-dashed border-gray-200 pt-2 font-bold dark:border-gray-700"><span>Credit left</span><span className={left > 0.009 ? "text-indigo-700 dark:text-indigo-300" : ""}>{formatCurrency(left, currency)}</span></p>
    </section>
  );
}

/** Shown on an invoice when a cancelled payment no longer covers it. */
export function ReopenedPayments({ invoice, history = [], allocations = [], currency, onView }) {
  const { reopened } = invoiceFunding(invoice, history, allocations);
  if (!reopened.length) return null;
  return (
    <section className="space-y-1.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/30">
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-amber-800 dark:text-amber-300"><RotateCcw size={11}/> Owed again</p>
      {reopened.map((entry, index) => (
        <div key={index} className="flex justify-between gap-3">
          <span className="min-w-0 break-words">Payment <Ref tx={entry.source} onView={onView}/> was cancelled{entry.at ? ` on ${day(entry.at)}` : ""}{entry.reason ? ` (${entry.reason})` : ""}</span>
          <strong className="text-amber-800 dark:text-amber-300">+{formatCurrency(entry.amount, currency)}</strong>
        </div>
      ))}
    </section>
  );
}

/** "Cancelled on 20 Nov · reason" (the date only exists for cancellations recorded after it was tracked). */
export function CancelledNote({ tx, className = "" }) {
  if (tx?.status !== "cancelled") return null;
  const at = cancelledAt(tx);
  const reason = cancelReason(tx);
  return <p className={className}>Cancelled{at ? ` on ${day(at)}` : ""}{reason ? ` · ${reason}` : ""}</p>;
}

/** Small summary line under a row in the transaction history. */
export function HistorySummary({ tx, history = [], allocations = [], currency }) {
  const parts = historySummary(tx, history, allocations);
  if (!parts.length) return null;
  const tone = { due: "text-orange-600 dark:text-orange-400", paid: "text-green-600 dark:text-green-400", credit: "text-indigo-600 dark:text-indigo-300" };
  return (
    <p className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-500 dark:text-gray-400">
      {parts.map((part, index) => (
        <span key={index} className={tone[part.tone] || ""}>{part.label}{part.amount !== undefined ? ` ${formatCurrency(part.amount, currency)}` : ""}</span>
      ))}
    </p>
  );
}
