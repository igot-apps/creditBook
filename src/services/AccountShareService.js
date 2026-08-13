import { supabase } from '../lib/supabaseClient';

export const AccountShareService = {
  generateShareReference: () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); 
    const randomNum = Math.floor(1000 + Math.random() * 9000); 
    return `REF-${dateStr}-${randomNum}`;
  },

  logShare: async (data) => {
    const { error } = await supabase
      .from('account_shares')
      .insert([
        {
          store_id: data.storeId,
          contact_id: data.contactId,
          channel: data.channel,
          scope: data.scope,
          reference: data.reference
        }
      ]);
      
    if (error) throw error;
  },

  getShareHistory: async (contactId) => {
    const { data, error } = await supabase
      .from('account_shares')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  }
};