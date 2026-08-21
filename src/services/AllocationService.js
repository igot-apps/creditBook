import { supabase } from '../lib/supabaseClient';

export const AllocationService = {
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