alter table public.transactions
  add column if not exists received_at timestamptz;

create unique index if not exists transactions_active_momo_reference_per_store
  on public.transactions (store_id, upper(btrim(reference)))
  where type = 'payment'
    and payment_method = 'momo'
    and coalesce(status, 'active') = 'active'
    and nullif(btrim(reference), '') is not null;
