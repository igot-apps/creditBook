-- Existing RLS policies reference public tables such as `contacts` without
-- schema qualification. These functions remain security invoker, so RLS stays
-- active; the public search path only lets those policy references resolve.
alter function public.use_payment_credit(
  uuid, uuid, numeric, uuid, text, timestamptz
) set search_path = public, pg_temp;

alter function public.record_invoice_payment(
  uuid, uuid, numeric, text, text, text, timestamptz
) set search_path = public, pg_temp;

alter function public.save_transaction_correction(
  uuid, uuid, jsonb, text
) set search_path = public, pg_temp;

alter function public.refresh_correction_balance(
  uuid, text
) set search_path = public, pg_temp;

alter function public.undo_transaction_correction(
  uuid
) set search_path = public, pg_temp;
