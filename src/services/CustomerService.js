import { supabase } from '../lib/supabaseClient';

export const CustomerService = {
  // 1. Get all customers for the logged-in user's store
  getAll: async (options = {}) => {
    const { limit = 30, offset = 0, search = "", fetchAll = false } = options;
    
    let query = supabase
      .from('contacts')
      .select('*')
      .eq('type', 'customer')
      .order('created_at', { ascending: false });

    // Server-side search (Lightning fast)
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    
    // Only paginate if we aren't fetching everything
    if (!fetchAll) {
      query = query.range(offset, offset + limit - 1);
    }

    const { data, error } = await query;
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
  },

  // 6. Delete a customer AND all their transactions (cascade)
delete: async (id) => {
  // 1. Delete all transactions tied to this customer
  const { error: txError } = await supabase
    .from('transactions')
    .delete()
    .eq('contact_id', id);
  if (txError) throw txError;

  // 2. Delete all suspended transactions tied to this customer
  const { error: suspError } = await supabase
    .from('suspended_transactions')
    .delete()
    .eq('contact_id', id);
  if (suspError) throw suspError;

  // 3. Delete the customer itself
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
};