import { useRef, useState } from "react";
import { ConfirmModal } from "./ConfirmModal";
import { SuspendedTransactionService } from "../services/SuspendedTransactionService";
import useStore from "../store/useStore";

export function DiscardInvoiceModal({ invoice, onClose, onDiscarded }) {
  const [isBusy, setIsBusy] = useState(false);
  const busy = useRef(false);
  const { clearAutoDraft, readOnly, showToast } = useStore();
  if (!invoice) return null;

  const discard = async () => {
    if (busy.current) return;
    if (invoice.id && readOnly) {
      showToast("View-only mode. You cannot delete a suspended invoice.");
      return;
    }
    busy.current = true;
    setIsBusy(true);
    try {
      if (invoice.id) await SuspendedTransactionService.deleteSuspendedTransaction(invoice.id, { requireMatch: true });
      clearAutoDraft(invoice.type, invoice.id);
      onDiscarded(invoice);
      showToast(invoice.id ? "Suspended invoice deleted" : "Draft discarded");
    } catch (error) {
      console.error(error);
      showToast("Could not discard the invoice. Try again.");
    } finally {
      busy.current = false;
      setIsBusy(false);
    }
  };

  return (
    <ConfirmModal
      isOpen
      onClose={onClose}
      onConfirm={discard}
      closeOnConfirm={false}
      isBusy={isBusy}
      title={invoice.id ? "Delete suspended invoice?" : "Discard draft?"}
      message={`This permanently removes the ${invoice.type} ${invoice.id ? "invoice" : "draft"}${invoice.contactName ? ` for ${invoice.contactName}` : ""}.`}
      confirmWord="OK"
      confirmButtonText={isBusy ? "Discarding…" : invoice.id ? "Delete invoice" : "Discard draft"}
    />
  );
}
