import { supabase } from '../lib/supabaseClient';

export const CustomerService = {
  // 1. Get all customers for the logged-in user's store
  getAll: async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('type', 'customer')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  },

  // 2. Get a single customer by ID
  getById: async (id) => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  },

  // 3. Add a new customer
  addCustomer: async (storeId, name, phone) => {
    const { data, error } = await supabase
      .from('contacts')
      .insert([
        { 
          store_id: storeId, 
          type: 'customer', 
          name, 
          phone: phone || '', 
          balance: 0 
        }
      ])
      .select()
      .single();
      
    if (error) throw error;
    return data.id;
  },

  // 4. Update customer details (Name, Phone, etc.)
  update: async (id, data) => {
    const { error } = await supabase
      .from('contacts')
      .update(data)
      .eq('id', id);
      
    if (error) throw error;
  },

  // 5. Update customer balance (Called after a transaction is saved/cancelled)
  updateBalance: async (id, newBalance) => {
    const { error } = await supabase
      .from('contacts')
      .update({ balance: newBalance })
      .eq('id', id);
      
    if (error) throw error;
  }
};