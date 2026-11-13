-- The app's existing RLS policies refer to public tables such as `contacts`
-- without schema qualification. Keep RLS active, while making those policy
-- references resolvable inside the credit functions.
alter function public.finalize_suspended_sale_with_credit(
  uuid, uuid, uuid, uuid, jsonb, numeric, numeric, numeric,
  text, jsonb, timestamptz, numeric, uuid
) set search_path = public, pg_temp;

alter function public.finalize_suspended_purchase_with_credit(
  uuid, uuid, uuid, uuid, jsonb, numeric, numeric, numeric,
  text, jsonb, numeric, uuid
) set search_path = public, pg_temp;

alter function public.create_invoice_with_credit(
  uuid, uuid, uuid, text, jsonb, numeric, numeric, numeric,
  text, jsonb, timestamptz, numeric, uuid
) set search_path = public, pg_temp;
