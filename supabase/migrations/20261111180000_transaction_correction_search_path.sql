-- Transaction updates can run legacy triggers that resolve contacts via search_path.
alter function public.save_transaction_correction(uuid, uuid, jsonb, text)
  set search_path = pg_catalog, public, pg_temp;

alter function public.undo_transaction_correction(uuid)
  set search_path = pg_catalog, public, pg_temp;

alter function public.refresh_correction_balance(uuid, text)
  set search_path = pg_catalog, public, pg_temp;
