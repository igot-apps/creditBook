import { Route, RotateCcw, History } from "lucide-react";
import { formatCurrency, formatDate } from "../utils/helpers";
import { moneyTrail, invoiceFunding, historySummary, invoiceTimeline, txReference, txWhen, cancelledAt, cancelReason, isWriteOff } from "../utils/moneyTrail";

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

const methodLabel = { cash: "Cash", momo: "MoMo", bank: "Bank" };
const appliedLabel = { payment: "Payment", credit: "Credit from", mixed: "Payment + later credit from", write_off: "Forgiven" };

/** One chronological story for an invoice: created → paid → credit → corrections → due / fully paid. */
export function InvoiceTimeline({ invoice, history = [], allocations = [], currency, onView, isSupplier = false }) {
  if (!invoice || !(invoice.type === "sale" || invoice.type === "purchase")) return null;
  const { events, due, extra, active } = invoiceTimeline(invoice, history, allocations);
  const last = events.filter(event => event.at).at(-1);
  const minus = amount => `−${formatCurrency(amount, currency)}`;
  const line = event => {
    switch (event.type) {
      case "created": return [`Invoice created${event.discount > 0 ? ` (after ${formatCurrency(event.discount, currency)} discount)` : ""}`, formatCurrency(event.amount, currency)];
      case "corrected": return [<>Corrected from <Ref tx={event.target} onView={onView}/>: {formatCurrency(event.from, currency)} → {formatCurrency(event.to, currency)}{event.reason ? ` · ${event.reason}` : ""}</>, null];
      case "paid": return [`Paid on invoice${event.method ? ` (${methodLabel[event.method] || event.method})` : ""}${event.reference ? ` · ${event.reference}` : ""}`, minus(event.amount)];
      case "applied": return [<span className={event.cancelledLater ? "text-gray-400 line-through" : ""}>{appliedLabel[event.kind]}{event.kind !== "write_off" && <> <Ref tx={event.source} onView={onView}/></>}{event.kind === "payment" && event.source.payment_method && event.source.payment_method !== "write_off" ? ` (${methodLabel[event.source.payment_method] || event.source.payment_method})` : ""}</span>, minus(event.amount)];
      case "reopened": return [<span className="text-amber-700 dark:text-amber-300">Payment <Ref tx={event.source} onView={onView}/> cancelled{event.reason ? ` · ${event.reason}` : ""}: owed again</span>, `+${formatCurrency(event.amount, currency)}`];
      case "replaced": return [<>Replaced by corrected invoice{event.target ? <> <Ref tx={event.target} onView={onView}/></> : ""}{event.reason ? ` · ${event.reason}` : ""}</>, null];
      case "cancelled": return [<span className="text-red-600 dark:text-red-400">Invoice cancelled{event.reason ? ` · ${event.reason}` : ""}</span>, null];
      default: return [null, null];
    }
  };
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-3 text-xs dark:border-gray-800 dark:bg-gray-900" aria-label="Invoice history">
      <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400"><History size={11}/> Invoice history</p>
      <ol className="space-y-2 border-l-2 border-gray-200 pl-3 dark:border-gray-700">
        {events.map((event, index) => {
          const [label, amount] = line(event);
          return (
            <li key={index}>
              <div className="flex justify-between gap-3"><span className="min-w-0 break-words"><span className="text-gray-500">{event.at ? day(event.at) : "Date not recorded"} · </span>{label}</span>{amount && <strong className="shrink-0 tabular-nums">{amount}</strong>}</div>
              {(amount || event.type === "created") && <p className="text-right text-[10px] text-gray-400">Balance {formatCurrency(event.balance, currency)}</p>}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 flex justify-between border-t border-dashed border-gray-200 pt-2 font-bold dark:border-gray-700">
        {!active ? <span className="text-gray-500">No longer counts towards the balance</span>
          : due > 0.009 ? <><span>Still due</span><span className="text-orange-600 dark:text-orange-400">{formatCurrency(due, currency)}</span></>
          : <><span className="text-green-600 dark:text-green-400">Fully paid{last ? ` · ${day(last.at)}` : ""}</span><span className="text-green-600 dark:text-green-400">{formatCurrency(0, currency)}</span></>}
      </p>
      {active && extra > 0.009 && <p className="mt-1 text-indigo-700 dark:text-indigo-300">{formatCurrency(extra, currency)} extra became {isSupplier ? "supplier" : "customer"} credit.</p>}
    </section>
  );
}
