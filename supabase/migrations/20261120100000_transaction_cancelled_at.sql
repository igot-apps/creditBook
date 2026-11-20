-- Record when an entry is cancelled. Older cancellations keep NULL: we do not invent dates.
alter table public.transactions
  add column if not exists cancelled_at timestamptz;

create or replace function public.set_transaction_cancelled_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.status::text = 'cancelled' and coalesce(old.status::text, 'active') <> 'cancelled' then
    new.cancelled_at := now();
  elsif new.status::text = 'active' and old.status::text = 'cancelled' then
    new.cancelled_at := null; -- e.g. a correction was undone and the original is active again
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_set_cancelled_at on public.transactions;
create trigger transactions_set_cancelled_at
  before update of status on public.transactions
  for each row execute function public.set_transaction_cancelled_at();
