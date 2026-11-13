create or replace function public.create_invoice_with_credit(
  p_invoice_id uuid,
  p_store uuid,
  p_contact uuid,
  p_invoice_type text,
  p_items jsonb,
  p_amount numeric,
  p_paid numeric,
  p_discount numeric,
  p_note text,
  p_invoice_payments jsonb,
  p_created_at timestamptz,
  p_credit_amount numeric,
  p_operation_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  source_row public.transactions%rowtype;
  source_available numeric;
  credit_left numeric := coalesce(p_credit_amount, 0);
  allocation_amount numeric;
  source_payment_type text;
begin
  if p_invoice_id is null or p_operation_id is null then
    raise exception 'Could not identify this invoice. Please try again.';
  end if;
  if p_invoice_type not in ('sale', 'purchase') then
    raise exception 'Choose a customer or supplier invoice.';
  end if;
  if exists (select 1 from public.transactions where id = p_invoice_id) then
    return p_invoice_id;
  end if;
  if p_amount is null or p_amount < 0 or p_paid is null or p_paid < 0
     or credit_left <= 0 or round(credit_left, 2) <> credit_left
     or credit_left > greatest(0, p_amount - p_paid) then
    raise exception 'Review the invoice total, payment, and credit amount.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_contact::text, 0));
  source_payment_type := case when p_invoice_type = 'sale' then 'payment' else 'supplier_payment' end;

  if p_invoice_type = 'sale' then
    insert into public.transactions
      (id, store_id, contact_id, type, amount, paid, discount, note, items, status, invoice_payments, created_at)
    values
      (p_invoice_id, p_store, p_contact, 'sale', p_amount, p_paid, coalesce(p_discount, 0),
       coalesce(p_note, ''), coalesce(p_items, '[]'::jsonb), 'active',
       coalesce(p_invoice_payments, '[]'::jsonb), coalesce(p_created_at, now()));
  else
    insert into public.transactions
      (id, store_id, contact_id, type, amount, paid, discount, note, items, status, invoice_payments, created_at)
    values
      (p_invoice_id, p_store, p_contact, 'purchase', p_amount, p_paid, coalesce(p_discount, 0),
       coalesce(p_note, ''), coalesce(p_items, '[]'::jsonb), 'active',
       coalesce(p_invoice_payments, '[]'::jsonb), coalesce(p_created_at, now()));
  end if;

  for source_row in
    select t.*
    from public.transactions t
    where t.store_id = p_store and t.contact_id = p_contact
      and t.type::text in (source_payment_type, p_invoice_type)
      and coalesce(t.status::text, 'active') = 'active'
      and t.replaced_by_transaction_id is null and t.credit_source_id is null
      and coalesce(t.payment_method::text, '') <> 'write_off'
      and not starts_with(coalesce(t.note, ''), '[FORGIVEN]')
      and t.id <> p_invoice_id
    order by coalesce(t.received_at, t.created_at), t.created_at, t.id
    for update
  loop
    exit when credit_left <= 0.009;
    select greatest(0,
      coalesce(source_row.paid, 0)
      - case when source_row.type::text = p_invoice_type then coalesce(source_row.amount, 0) else 0 end
      - coalesce((
          select sum(a.amount)
          from public.payment_allocations a
          join public.transactions i on i.id = a.sale_id
          where a.payment_id = source_row.id
            and i.type::text = p_invoice_type
            and coalesce(i.status::text, 'active') = 'active'
            and i.replaced_by_transaction_id is null
        ), 0)
      + coalesce((
          select sum(r.paid)
          from public.transactions r
          where r.credit_source_id = source_row.id
            and coalesce(r.status::text, 'active') = 'active'
        ), 0)
    ) into source_available;

    allocation_amount := least(source_available, credit_left);
    if allocation_amount > 0.009 then
      insert into public.payment_allocations
        (payment_id, sale_id, contact_id, amount, credit_operation_ids)
      values
        (source_row.id, p_invoice_id, p_contact, allocation_amount, array[p_operation_id])
      on conflict (payment_id, sale_id) do update
        set amount = public.payment_allocations.amount + excluded.amount,
            credit_operation_ids = public.payment_allocations.credit_operation_ids || excluded.credit_operation_ids;
      credit_left := credit_left - allocation_amount;
    end if;
  end loop;

  if credit_left > 0.009 then
    raise exception 'Available credit changed. Review the new amount and try again.';
  end if;

  update public.contacts
  set balance = (
    select coalesce(sum(
      case when t.type::text = p_invoice_type then coalesce(t.amount, 0) else 0 end
      - coalesce(t.paid, 0)
    ), 0)
    from public.transactions t
    where t.contact_id = p_contact and t.store_id = p_store
      and t.type::text in (p_invoice_type, source_payment_type)
      and coalesce(t.status::text, 'active') = 'active'
      and t.replaced_by_transaction_id is null
  )
  where id = p_contact;

  return p_invoice_id;
end;
$$;

revoke execute on function public.create_invoice_with_credit(uuid, uuid, uuid, text, jsonb, numeric, numeric, numeric, text, jsonb, timestamptz, numeric, uuid) from public, anon;
grant execute on function public.create_invoice_with_credit(uuid, uuid, uuid, text, jsonb, numeric, numeric, numeric, text, jsonb, timestamptz, numeric, uuid) to authenticated;
