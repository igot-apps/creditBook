alter table public.suspended_transactions
  add column if not exists invoice_payments jsonb not null default '[]'::jsonb;

alter table public.transactions
  add column if not exists invoice_payments jsonb not null default '[]'::jsonb;
