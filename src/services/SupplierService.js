import { supabase } from '../lib/supabaseClient';

export const SupplierService = {
  // 1. Get all suppliers
getAll: async (options = {}) => {
    const { limit = 30, offset = 0, search = "", fetchAll = false } = options;
    
    let query = supabase
      .from('contacts')
      .select('*')
      .eq('type', 'supplier')
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

  // 2. Get a single supplier
  getById: async (id) => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    return data;
  },

  // 3. Add a new supplier
  addSupplier: async (storeId, name, phone) => {
    const { data, error } = await supabase
      .from('contacts')
      .insert([
        { 
          store_id: storeId, 
          type: 'supplier', 
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

  // 4. Update supplier details
  update: async (id, data) => {
    const { error } = await supabase
      .from('contacts')
      .update(data)
      .eq('id', id);
      
    if (error) throw error;
  },

  // 5. Update supplier balance
  updateBalance: async (id, newBalance) => {
    const { error } = await supabase
      .from('contacts')
      .update({ balance: newBalance })
      .eq('id', id);
      
    if (error) throw error;
  }
};