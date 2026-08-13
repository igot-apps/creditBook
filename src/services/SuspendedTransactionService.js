import { supabase } from '../lib/supabaseClient';

export const SuspendedTransactionService = {
  suspendTransaction: async (data) => {
    if (data.id) {
      const { error } = await supabase
        .from('suspended_transactions')
        .update({
          contact_name: data.contactName, // Ensure name is updated if changed
          contact_phone: data.contactPhone,
          items: data.items,
          amount: data.amount,
          paid: data.paid,
          discount: data.discount,
          note: data.note,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);
      if (error) throw error;
      return data.id;
    } else {
      const { data: newRecord, error } = await supabase
        .from('suspended_transactions')
        .insert([
          {
            store_id: data.storeId,
            contact_id: data.contactId,
            type: data.type,
            contact_name: data.contactName,
            contact_phone: data.contactPhone,
            items: data.items,
            amount: data.amount,
            paid: data.paid,
            discount: data.discount,
            note: data.note
          }
        ])
        .select()
        .single();
      if (error) throw error;
      return newRecord.id;
    }
  },

  getSuspendedTransactions: async () => {
    const { data, error } = await supabase
      .from('suspended_transactions')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    // 👇 Map snake_case from Supabase to camelCase for the UI
    return (data || []).map(s => ({
      id: s.id,
      storeId: s.store_id,
      contactId: s.contact_id,
      type: s.type,
      contactName: s.contact_name,
      contactPhone: s.contact_phone,
      items: s.items,
      amount: s.amount,
      paid: s.paid,
      discount: s.discount,
      note: s.note,
      createdAt: s.created_at
    }));
  },

  checkDuplicateSuspended: async (storeId, contactId, type) => {
    if (!contactId) return null; 
    
    const { data, error } = await supabase
      .from('suspended_transactions')
      .select('*')
      .eq('contact_id', contactId)
      .eq('type', type)
      .maybeSingle(); 
      
    if (error) throw error;
    if (!data) return null;

    // 👇 Map snake_case to camelCase
    return {
      id: data.id,
      storeId: data.store_id,
      contactId: data.contact_id,
      type: data.type,
      contactName: data.contact_name,
      contactPhone: data.contact_phone,
      items: data.items,
      amount: data.amount,
      paid: data.paid,
      discount: data.discount,
      note: data.note
    };
  },

  deleteSuspendedTransaction: async (id) => {
    const { error } = await supabase
      .from('suspended_transactions')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};