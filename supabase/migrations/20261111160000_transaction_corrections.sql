alter table public.transactions
  add column if not exists corrected_by uuid,
  add column if not exists corrected_at timestamptz,
  add column if not exists correction_reason text,
  add column if not exists correction_undone_by uuid,
  add column if not exists correction_undone_at timestamptz,
  add column if not exists correction_allocations jsonb;

create or replace function public.save_transaction_correction(
  p_original uuid, p_replacement uuid, p_changes jsonb, p_reason text
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  original public.transactions%rowtype;
  replacement public.transactions%rowtype;
  allocation public.payment_allocations%rowtype;
  remaining numeric;
  applied numeric;
begin
  if auth.uid() is null or nullif(btrim(p_reason), '') is null or p_replacement is null then
    raise exception 'Enter a reason for the correction.';
  end if;
  select * into strict original from public.transactions where id = p_original;
  perform pg_advisory_xact_lock(hashtextextended(original.contact_id::text, 0));
  select * into strict original from public.transactions where id = p_original for update;
  if original.replaced_by_transaction_id = p_replacement then return p_replacement; end if;
  if coalesce(original.status::text, 'active') not in ('active', 'being_corrected')
     or original.replaced_by_transaction_id is not null
     or original.type::text not in ('sale', 'purchase', 'payment', 'supplier_payment')
     or original.credit_source_id is not null
     or coalesce(original.payment_method::text, '') = 'write_off'
     or starts_with(coalesce(original.note, ''), '[FORGIVEN]')
     or exists (select 1 from public.transactions r where r.credit_source_id = original.id and coalesce(r.status::text, 'active') = 'active') then
    raise exception 'This entry is no longer available to correct.';
  end if;

  select * into replacement from jsonb_populate_record(original, p_changes);
  if replacement.amount is null or replacement.amount < 0 or replacement.paid is null or replacement.paid < 0 then
    raise exception 'Enter valid amounts for the correction.';
  end if;
  if original.type::text in ('payment', 'supplier_payment') then
    replacement.amount := 0;
    if replacement.paid <= 0 then raise exception 'Enter a positive payment amount.'; end if;
  end if;

  -- Retire the original first so a corrected MoMo payment can retain its reference.
  update public.transactions set status = 'cancelled', cancel_reason = btrim(p_reason) where id = p_original;
  insert into public.transactions (
    id, store_id, contact_id, type, amount, paid, discount, note, items, status,
    corrects_transaction_id, payment_method, reference, received_at, invoice_payments,
    created_at, corrected_by, corrected_at, correction_reason
  ) values (
    p_replacement, original.store_id, original.contact_id, original.type, replacement.amount,
    replacement.paid, replacement.discount, replacement.note, replacement.items, 'active',
    p_original, replacement.payment_method, replacement.reference, replacement.received_at,
    replacement.invoice_payments, original.created_at, auth.uid(), now(), btrim(p_reason)
  );
  update public.transactions set replaced_by_transaction_id = p_replacement where id = p_original;

  if original.type::text in ('sale', 'purchase') then
    remaining := greatest(0, replacement.amount - replacement.paid);
    for allocation in
      select a.* from public.payment_allocations a join public.transactions p on p.id = a.payment_id
      where a.sale_id = p_original and coalesce(p.status::text, 'active') = 'active'
        and p.replaced_by_transaction_id is null
      order by a.created_at, a.id
    loop
      applied := least(remaining, allocation.amount);
      if applied < allocation.amount and exists (
        select 1 from public.transactions p where p.id = allocation.payment_id
          and (p.payment_method::text = 'write_off' or starts_with(coalesce(p.note, ''), '[FORGIVEN]'))
      ) then
        raise exception 'This invoice has a write-off. Review the write-off before reducing the balance below it.';
      end if;
      if applied > 0 then
        insert into public.payment_allocations (payment_id, sale_id, contact_id, amount)
          values (allocation.payment_id, p_replacement, original.contact_id, applied);
        remaining := remaining - applied;
      end if;
    end loop;
  end if;

  remaining := greatest(0, replacement.paid - replacement.amount);
  for allocation in
    select a.* from public.payment_allocations a join public.transactions i on i.id = a.sale_id
    where a.payment_id = p_original and coalesce(i.status::text, 'active') = 'active'
      and i.replaced_by_transaction_id is null
    order by a.created_at, a.id
  loop
    applied := least(remaining, allocation.amount);
    if applied < allocation.amount and original.type::text in ('sale', 'purchase') then
      raise exception 'Credit from this invoice has already been used. The corrected invoice must still cover that credit.';
    end if;
    if applied > 0 then
      insert into public.payment_allocations (payment_id, sale_id, contact_id, amount)
        values (p_replacement, allocation.sale_id, original.contact_id, applied);
      remaining := remaining - applied;
    end if;
  end loop;

  update public.transactions
    set correction_allocations = (
      select coalesce(jsonb_agg(to_jsonb(a) order by a.id), '[]'::jsonb)
      from public.payment_allocations a where a.sale_id = p_replacement or a.payment_id = p_replacement
    )
    where id = p_replacement;
  perform public.refresh_correction_balance(original.contact_id, original.type::text);
  return p_replacement;
end;
$$;

create or replace function public.refresh_correction_balance(p_contact uuid, p_type text)
returns void language sql security invoker set search_path = '' as $$
  update public.contacts
  set balance = (
    select coalesce(sum(coalesce(t.amount, 0) - coalesce(t.paid, 0)), 0)
    from public.transactions t where t.contact_id = p_contact
      and t.type::text in (
        case when p_type in ('purchase', 'supplier_payment') then 'purchase' else 'sale' end,
        case when p_type in ('purchase', 'supplier_payment') then 'supplier_payment' else 'payment' end
      )
      and coalesce(t.status::text, 'active') = 'active' and t.replaced_by_transaction_id is null
  )
  where id = p_contact;
$$;

create or replace function public.undo_transaction_correction(p_replacement uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  original public.transactions%rowtype;
  replacement public.transactions%rowtype;
  allocations jsonb;
begin
  select * into strict replacement from public.transactions where id = p_replacement;
  perform pg_advisory_xact_lock(hashtextextended(replacement.contact_id::text, 0));
  select * into strict replacement from public.transactions where id = p_replacement for update;
  select * into strict original from public.transactions where id = replacement.corrects_transaction_id for update;
  if replacement.correction_undone_at is not null then return original.id; end if;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.id), '[]'::jsonb) into allocations
    from public.payment_allocations a where a.sale_id = p_replacement or a.payment_id = p_replacement;
  if auth.uid() is null or original.replaced_by_transaction_id is distinct from p_replacement
     or coalesce(replacement.status::text, 'active') <> 'active' or replacement.replaced_by_transaction_id is not null
     or allocations is distinct from replacement.correction_allocations
     or exists (select 1 from public.transactions r where r.credit_source_id = p_replacement and coalesce(r.status::text, 'active') = 'active') then
    raise exception 'This correction cannot be undone because the entry or its payments have changed.';
  end if;
  update public.transactions set status = 'cancelled', cancel_reason = 'Correction undone',
    correction_undone_by = auth.uid(), correction_undone_at = now() where id = p_replacement;
  update public.transactions set status = 'active', replaced_by_transaction_id = null
    where id = original.id;
  perform public.refresh_correction_balance(original.contact_id, original.type::text);
  return original.id;
end;
$$;

revoke execute on function public.save_transaction_correction(uuid, uuid, jsonb, text) from public, anon;
revoke execute on function public.undo_transaction_correction(uuid) from public, anon;
revoke execute on function public.refresh_correction_balance(uuid, text) from public, anon;
grant execute on function public.save_transaction_correction(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.undo_transaction_correction(uuid) to authenticated;
grant execute on function public.refresh_correction_balance(uuid, text) to authenticated;
