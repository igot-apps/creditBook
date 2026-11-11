import { supabase } from '../lib/supabaseClient';

export const AllocationService = {
  useCredit: async ({ sourceId, invoiceId, amount, operationId, reference, receivedAt }) => {
    const { error } = await supabase.rpc('use_payment_credit', {
      p_source: sourceId,
      p_invoice: invoiceId || null,
      p_amount: amount,
      p_operation_id: operationId,
      p_reference: reference || null,
      p_received_at: receivedAt || null,
    });
    if (error) throw error;
  },

  // All allocation rows for a contact
  getByContact: async (contactId) => {
    const { data, error } = await supabase
      .from('payment_allocations')
      .select('id, payment_id, sale_id, contact_id, amount, created_at')
      .eq('contact_id', contactId);
    if (error) throw error;
    return data || [];
  },

  // Insert FIFO allocation rows — safe to call multiple times (upsert)
  createMany: async (rows) => {
    if (!rows || rows.length === 0) return;
    const { error } = await supabase
      .from('payment_allocations')
      .upsert(rows, { onConflict: 'payment_id,sale_id' });
    if (error) throw error;
  },
};
