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
};