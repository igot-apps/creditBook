alter table public.suspended_transactions
  add column if not exists pending_credit_amount numeric not null default 0;

do $$ begin
  alter table public.suspended_transactions
    add constraint suspended_transactions_pending_credit_nonnegative
    check (pending_credit_amount >= 0 and round(pending_credit_amount, 2) = pending_credit_amount);
exception when duplicate_object then null;
end $$;

create or replace function public.finalize_suspended_purchase_with_credit(
  p_invoice_id uuid, p_suspended_id uuid, p_store uuid, p_contact uuid,
  p_items jsonb, p_amount numeric, p_paid numeric, p_discount numeric,
  p_note text, p_invoice_payments jsonb, p_credit_amount numeric, p_operation_id uuid
) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  draft public.suspended_transactions%rowtype;
  source_row public.transactions%rowtype;
  source_available numeric;
  credit_left numeric := coalesce(p_credit_amount, 0);
  allocation_amount numeric;
begin
  if p_invoice_id is null or p_operation_id is null then
    raise exception 'Could not identify this purchase. Please try again.';
  end if;
  if exists (select 1 from public.transactions where id = p_invoice_id) then return p_invoice_id; end if;
  if p_amount is null or p_amount < 0 or p_paid is null or p_paid < 0
     or credit_left < 0 or round(credit_left, 2) <> credit_left
     or credit_left > greatest(0, p_amount - p_paid) then
    raise exception 'Review the purchase total, payment, and credit amount.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_contact::text, 0));
  select * into strict draft from public.suspended_transactions
    where id = p_suspended_id for update;
  if draft.store_id is distinct from p_store or draft.contact_id is distinct from p_contact
     or draft.type::text <> 'purchase' then
    raise exception 'This suspended purchase is no longer available.';
  end if;

  insert into public.transactions
    (id, store_id, contact_id, type, amount, paid, discount, note, items, status, invoice_payments, created_at)
  values
    (p_invoice_id, p_store, p_contact, 'purchase', p_amount, p_paid, coalesce(p_discount, 0),
     coalesce(p_note, ''), coalesce(p_items, '[]'::jsonb), 'active',
     coalesce(p_invoice_payments, '[]'::jsonb), coalesce(draft.created_at, now()));

  for source_row in
    select t.* from public.transactions t
    where t.store_id = p_store and t.contact_id = p_contact
      and t.type::text in ('supplier_payment', 'purchase')
      and coalesce(t.status::text, 'active') = 'active'
      and t.replaced_by_transaction_id is null and t.credit_source_id is null
      and coalesce(t.payment_method::text, '') <> 'write_off'
      and not starts_with(coalesce(t.note, ''), '[FORGIVEN]') and t.id <> p_invoice_id
    order by coalesce(t.received_at, t.created_at), t.created_at, t.id for update
  loop
    exit when credit_left <= 0.009;
    select greatest(0,
      coalesce(source_row.paid, 0)
      - case when source_row.type::text = 'purchase' then coalesce(source_row.amount, 0) else 0 end
      - coalesce((select sum(a.amount) from public.payment_allocations a
          join public.transactions i on i.id = a.sale_id
          where a.payment_id = source_row.id and i.type::text = 'purchase'
            and coalesce(i.status::text, 'active') = 'active' and i.replaced_by_transaction_id is null), 0)
      + coalesce((select sum(r.paid) from public.transactions r
          where r.credit_source_id = source_row.id and coalesce(r.status::text, 'active') = 'active'), 0)
    ) into source_available;
    allocation_amount := least(source_available, credit_left);
    if allocation_amount > 0.009 then
      insert into public.payment_allocations
        (payment_id, sale_id, contact_id, amount, credit_operation_ids)
      values (source_row.id, p_invoice_id, p_contact, allocation_amount, array[p_operation_id])
      on conflict (payment_id, sale_id) do update
        set amount = public.payment_allocations.amount + excluded.amount,
            credit_operation_ids = public.payment_allocations.credit_operation_ids || excluded.credit_operation_ids;
      credit_left := credit_left - allocation_amount;
    end if;
  end loop;
  if credit_left > 0.009 then
    raise exception 'Available supplier credit changed. Review the new amount and try again.';
  end if;

  delete from public.suspended_transactions where id = p_suspended_id;
  update public.contacts set balance = (
    select coalesce(sum(case when t.type::text = 'purchase' then coalesce(t.amount, 0) else 0 end - coalesce(t.paid, 0)), 0)
    from public.transactions t where t.contact_id = p_contact and t.store_id = p_store
      and t.type::text in ('purchase', 'supplier_payment')
      and coalesce(t.status::text, 'active') = 'active' and t.replaced_by_transaction_id is null
  ) where id = p_contact;
  return p_invoice_id;
exception when no_data_found then raise exception 'This suspended purchase is no longer available.';
end;
$$;

revoke execute on function public.finalize_suspended_purchase_with_credit(uuid, uuid, uuid, uuid, jsonb, numeric, numeric, numeric, text, jsonb, numeric, uuid) from public, anon;
grant execute on function public.finalize_suspended_purchase_with_credit(uuid, uuid, uuid, uuid, jsonb, numeric, numeric, numeric, text, jsonb, numeric, uuid) to authenticated;
