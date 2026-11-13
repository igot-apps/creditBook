alter table public.transactions
  add column if not exists credit_source_id uuid references public.transactions(id);

alter table public.payment_allocations
  add column if not exists credit_operation_ids uuid[] not null default '{}';

create or replace function public.use_payment_credit(
  p_source uuid, p_invoice uuid, p_amount numeric,
  p_operation_id uuid, p_reference text, p_received_at timestamptz
) returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  source_row public.transactions%rowtype;
  invoice_row public.transactions%rowtype;
  available numeric;
  due numeric;
  invoice_type text;
  payment_type text;
begin
  if p_operation_id is null or p_amount is null or p_amount <= 0 or round(p_amount, 2) <> p_amount then
    raise exception 'Enter a positive amount with up to two decimal places.';
  end if;

  select * into strict source_row from public.transactions where id = p_source;
  perform pg_advisory_xact_lock(hashtextextended(source_row.contact_id::text, 0));
  select * into strict source_row from public.transactions where id = p_source for update;
  if p_invoice is null and exists (
    select 1 from public.transactions where id = p_operation_id and credit_source_id = p_source
  ) then
    return;
  end if;
  if p_invoice is not null and exists (
    select 1 from public.payment_allocations
    where payment_id = p_source and sale_id = p_invoice and p_operation_id = any(credit_operation_ids)
  ) then
    return;
  end if;
  if source_row.type::text in ('sale', 'payment') then
    invoice_type := 'sale';
    payment_type := 'payment';
  else
    invoice_type := 'purchase';
    payment_type := 'supplier_payment';
  end if;
  if source_row.type::text not in ('sale', 'payment', 'purchase', 'supplier_payment')
     or coalesce(source_row.status::text, 'active') <> 'active'
     or source_row.replaced_by_transaction_id is not null
     or source_row.credit_source_id is not null
     or coalesce(source_row.payment_method::text, '') = 'write_off'
     or starts_with(coalesce(source_row.note, ''), '[FORGIVEN]') then
    raise exception 'This payment has no available credit.';
  end if;

  select coalesce(source_row.paid, 0)
       - case when source_row.type::text = invoice_type then coalesce(source_row.amount, 0) else 0 end
       - coalesce((select sum(a.amount) from public.payment_allocations a
           join public.transactions i on i.id = a.sale_id
           where a.payment_id = p_source and i.type::text = invoice_type
             and coalesce(i.status::text, 'active') = 'active' and i.replaced_by_transaction_id is null), 0)
       + coalesce((select sum(r.paid) from public.transactions r
           where r.credit_source_id = p_source and coalesce(r.status::text, 'active') = 'active'), 0)
    into available;
  if p_amount > available then
    raise exception 'The amount exceeds the available credit.';
  end if;

  if p_invoice is not null then
    select * into strict invoice_row from public.transactions where id = p_invoice for update;
    if invoice_row.id = source_row.id or invoice_row.contact_id is distinct from source_row.contact_id
       or invoice_row.store_id is distinct from source_row.store_id
       or invoice_row.type::text <> invoice_type or coalesce(invoice_row.status::text, 'active') <> 'active'
       or invoice_row.replaced_by_transaction_id is not null then
      raise exception 'Select an open invoice for this contact.';
    end if;
    select coalesce(invoice_row.amount, 0) - coalesce(invoice_row.paid, 0) - coalesce(sum(a.amount), 0)
      into due
      from public.payment_allocations a join public.transactions p on p.id = a.payment_id
      where a.sale_id = p_invoice and coalesce(p.status::text, 'active') = 'active'
        and p.replaced_by_transaction_id is null;
    if p_amount > due then
      raise exception 'The amount exceeds the remaining invoice balance.';
    end if;
    insert into public.payment_allocations (payment_id, sale_id, contact_id, amount, credit_operation_ids)
      values (p_source, p_invoice, source_row.contact_id, p_amount, array[p_operation_id])
      on conflict (payment_id, sale_id) do update
        set amount = public.payment_allocations.amount + excluded.amount,
            credit_operation_ids = public.payment_allocations.credit_operation_ids || excluded.credit_operation_ids;
  else
    if nullif(btrim(p_reference), '') is null or p_received_at is null or p_received_at > now() then
      raise exception 'Enter a refund reference and a valid date.';
    end if;
    -- A refund reverses part of the cash recorded by the original payment.
    insert into public.transactions
      (id, store_id, contact_id, type, amount, paid, discount, note, items, status, reference, received_at, credit_source_id)
    select p_operation_id, source_row.store_id, source_row.contact_id, t.type, 0, -p_amount, 0,
      'Credit refund', '[]', 'active', btrim(p_reference), p_received_at, p_source
    from jsonb_populate_record(null::public.transactions, jsonb_build_object('type', payment_type)) t;
    update public.contacts
      set balance = (
        select coalesce(sum(case when t.type::text = invoice_type then coalesce(t.amount, 0) else 0 end - coalesce(t.paid, 0)), 0)
        from public.transactions t
        where t.contact_id = source_row.contact_id and t.store_id = source_row.store_id
          and t.type::text in (invoice_type, payment_type)
          and coalesce(t.status::text, 'active') = 'active' and t.replaced_by_transaction_id is null
      )
      where id = source_row.contact_id;
  end if;
end;
$$;

revoke execute on function public.use_payment_credit(uuid, uuid, numeric, uuid, text, timestamptz) from public, anon;
grant execute on function public.use_payment_credit(uuid, uuid, numeric, uuid, text, timestamptz) to authenticated;

create or replace function public.record_invoice_payment(
  p_id uuid, p_invoice uuid, p_amount numeric, p_method text,
  p_reference text, p_note text, p_received_at timestamptz
) returns void language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  invoice_row public.transactions%rowtype;
  invoice_type text;
  payment_type text;
  due numeric;
begin
  if p_id is null or p_amount is null or p_amount <= 0 or round(p_amount, 2) <> p_amount then
    raise exception 'Enter a positive amount with up to two decimal places.';
  end if;
  if p_method is null or p_method not in ('cash', 'momo', 'bank')
     or (p_method = 'momo' and nullif(btrim(p_reference), '') is null)
     or p_received_at > now() then
    raise exception 'Check the payment method, reference, and date.';
  end if;
  select * into strict invoice_row from public.transactions where id = p_invoice;
  perform pg_advisory_xact_lock(hashtextextended(invoice_row.contact_id::text, 0));
  if exists (select 1 from public.payment_allocations where payment_id = p_id and sale_id = p_invoice) then
    return;
  end if;
  select * into strict invoice_row from public.transactions where id = p_invoice for update;
  invoice_type := invoice_row.type::text;
  if invoice_type not in ('sale', 'purchase')
     or coalesce(invoice_row.status::text, 'active') <> 'active'
     or invoice_row.replaced_by_transaction_id is not null then
    raise exception 'This invoice is no longer open.';
  end if;
  payment_type := case when invoice_type = 'sale' then 'payment' else 'supplier_payment' end;
  select coalesce(invoice_row.amount, 0) - coalesce(invoice_row.paid, 0) - coalesce(sum(a.amount), 0)
    into due
    from public.payment_allocations a join public.transactions p on p.id = a.payment_id
    where a.sale_id = p_invoice and coalesce(p.status::text, 'active') = 'active'
      and p.replaced_by_transaction_id is null;
  if due <= 0 then
    raise exception 'This invoice has already been paid.';
  end if;

  insert into public.transactions
    (id, store_id, contact_id, type, amount, paid, discount, note, items, status, payment_method, reference, received_at)
  select p_id, invoice_row.store_id, invoice_row.contact_id, t.type, 0, p_amount, 0,
    coalesce(p_note, ''), '[]', 'active', t.payment_method,
    nullif(btrim(p_reference), ''), coalesce(p_received_at, now())
  from jsonb_populate_record(null::public.transactions, jsonb_build_object('type', payment_type, 'payment_method', p_method)) t;

  insert into public.payment_allocations (payment_id, sale_id, contact_id, amount)
    values (p_id, p_invoice, invoice_row.contact_id, least(p_amount, due));

  update public.contacts
    set balance = (
      select coalesce(sum(case when t.type::text = invoice_type then coalesce(t.amount, 0) else 0 end - coalesce(t.paid, 0)), 0)
      from public.transactions t
      where t.contact_id = invoice_row.contact_id and t.store_id = invoice_row.store_id
        and t.type::text in (invoice_type, payment_type)
        and coalesce(t.status::text, 'active') = 'active' and t.replaced_by_transaction_id is null
    )
    where id = invoice_row.contact_id;
end;
$$;

revoke execute on function public.record_invoice_payment(uuid, uuid, numeric, text, text, text, timestamptz) from public, anon;
grant execute on function public.record_invoice_payment(uuid, uuid, numeric, text, text, text, timestamptz) to authenticated;
