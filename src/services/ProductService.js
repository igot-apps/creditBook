import { supabase } from '../lib/supabaseClient';

// 👇 Category emojis for the product picker UI
export const CATEGORY_EMOJIS = {
  "General": "📦",
  "Food & Beverage": "🍔",
  "Electronics": "📱",
  "Clothing": "👕",
  "Health & Beauty": "💄",
  "Home & Garden": "🏠",
  "Automotive": "🚗",
  "Services": "🛠️",
  "Other": "📌"
};

export const ProductService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  },

  // Returns the list of categories for the UI
  getCategories: async () => {
    return Object.keys(CATEGORY_EMOJIS);
  },

  // 👇 ADDED: Get emoji for a specific category
  getCategoryEmoji: (category) => {
    return CATEGORY_EMOJIS[category] || "📦";
  },

  // 👇 ADDED: Track product usage for "Most Used" and "Recent" tabs
  trackUsage: async (productId) => {
    try {
      // First get the current usage count to increment it
      const { data: product } = await supabase
        .from('products')
        .select('usage_count')
        .eq('id', productId)
        .single();
        
      const newCount = (product?.usage_count || 0) + 1;
      
      await supabase
        .from('products')
        .update({ 
          usage_count: newCount, 
          last_used_at: new Date().toISOString() 
        })
        .eq('id', productId);
    } catch (error) {
      console.error("Failed to track usage", error);
    }
  },

  create: async (storeId, productData) => {
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          store_id: storeId,
          name: productData.name,
          category: productData.category || 'General',
          brand: productData.brand || '',
          is_favourite: productData.isFavourite || false,
          units: productData.units || [], // JSONB
          usage_count: 0,
          last_used_at: null
        }
      ])
      .select()
      .single();
      
    if (error) throw error;
    return data.id;
  },

  update: async (id, data) => {
    const { error } = await supabase
      .from('products')
      .update(data)
      .eq('id', id);
      
    if (error) throw error;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};