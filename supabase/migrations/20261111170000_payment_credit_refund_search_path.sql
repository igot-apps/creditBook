-- Legacy transaction triggers resolve contacts through the caller's search path.
-- Keep the path scoped to this RPC, with temporary objects searched last.
alter function public.use_payment_credit(uuid, uuid, numeric, uuid, text, timestamptz)
  set search_path = pg_catalog, public, pg_temp;
