import { supabase } from '../lib/supabaseClient';

// 👇 Translates the app's camelCase keys -> Supabase snake_case columns
// This permanently prevents PGRST204 "column not found" errors.
const toSnake = (obj) => {
  const map = {
    cancelReason: 'cancel_reason',
    replacedByTransactionId: 'replaced_by_transaction_id',
    correctsTransactionId: 'corrects_transaction_id',
    paymentMethod: 'payment_method',
    contactName: 'contact_name',
    contactPhone: 'contact_phone',
    storeId: 'store_id',
    contactId: 'contact_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    reference: 'reference',
  };
  const out = {};
  Object.keys(obj || {}).forEach(k => {
    out[map[k] || k] = obj[k];
  });
  return out;
};

export const TransactionService = {
  recordInvoicePayment: async ({ id, invoiceId, amount, method, reference, note, receivedAt }) => {
    const { error } = await supabase.rpc('record_invoice_payment', {
      p_id: id,
      p_invoice: invoiceId,
      p_amount: amount,
      p_method: method,
      p_reference: reference || null,
      p_note: note,
      p_received_at: receivedAt || null,
    });
    if (error) throw error;
  },

  getAll: async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getHistory: async (contactId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getById: async (id) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (storeId, contactId, type, items, amount, paid, note, extraData = {}) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          store_id: storeId,
          contact_id: contactId,
          type: type,
          amount: parseFloat(amount) || 0,
          paid: parseFloat(paid) || 0,
          discount: parseFloat(extraData.discount) || 0,
          note: note || '',
          items: items || [],
          status: 'active',
          corrects_transaction_id: extraData.correctsTransactionId || null,
          payment_method: extraData.paymentMethod || null,
          reference: extraData.reference || null,
          ...(extraData.receivedAt && { received_at: extraData.receivedAt }),
          ...(extraData.invoicePayments?.length && { invoice_payments: extraData.invoicePayments }),
        }
      ])
      .select()
      .single();
    if (error) throw error;
    return data.id;
  },

  // 👇 FIXED: auto-translates camelCase -> snake_case
  update: async (id, updateData) => {
    const { error } = await supabase
      .from('transactions')
      .update(toSnake(updateData))
      .eq('id', id);
    if (error) throw error;
  },

  cancelTransaction: async (id, cancelReason) => {
    const { error } = await supabase
      .from('transactions')
      .update({ status: 'cancelled', cancel_reason: cancelReason })
      .eq('id', id);
    if (error) throw error;
  },

  findMomoPayment: async (storeId, reference) => {
    const query = supabase
      .from('transactions')
      .select('id, contact_id, paid, received_at, created_at')
      .eq('store_id', storeId)
      .eq('type', 'payment')
      .eq('payment_method', 'momo')
      .or('status.eq.active,status.is.null');
    const matchingReference = /^[A-Z0-9-]+$/.test(reference)
      ? query.ilike('reference', reference)
      : query.eq('reference', reference);
    const { data, error } = await matchingReference.limit(1).maybeSingle();
    if (error) throw error;
    return data;
  },

  recordPayment: async (storeId, contactId, amount, note, extraData = {}) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          store_id: storeId,
          contact_id: contactId,
          type: 'payment',
          amount: 0,
          paid: parseFloat(amount) || 0,
          discount: 0,
          note: note || '',
          payment_method: extraData.paymentMethod || 'cash',
          reference: extraData.reference || null,
          ...(extraData.receivedAt && { received_at: extraData.receivedAt }),
          status: 'active',
        }
      ])
      .select()
      .single();
    if (error) throw error;
    return data.id;
  },

  recordSupplierPayment: async (storeId, contactId, amount, note, extraData = {}) => {
    const { data, error } = await supabase
      .from('transactions')
      .insert([
        {
          store_id: storeId,
          contact_id: contactId,
          type: 'supplier_payment',
          amount: 0,
          paid: parseFloat(amount) || 0,
          discount: 0,
          note: note || '',
          payment_method: extraData.paymentMethod || 'cash',
          reference: extraData.reference || null,
          status: 'active',
        }
      ])
      .select()
      .single();
    if (error) throw error;
    return data.id;
  },
// 6. Record a debt forgiveness (write-off) with a reason
recordWriteOff: async (storeId, contactId, amount, reason) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert([
      {
        store_id: storeId,
        contact_id: contactId,
        type: 'payment', // 👈 Uses existing valid type (bypasses ENUM errors)
        amount: 0,
        paid: parseFloat(amount) || 0,
        discount: 0,
        note: `[FORGIVEN] ${reason || ''}`, // 👈 Special marker for the UI
        payment_method: 'write_off', 
        items: [],
        status: 'active',
      }
    ])
    .select()
    .single();
  if (error) throw error;
  return data.id;
},
};
