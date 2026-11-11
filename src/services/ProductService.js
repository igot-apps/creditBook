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

  addUnit: async (storeId, productId, unit) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: product, error: readError } = await supabase
        .from('products').select('units').eq('store_id', storeId).eq('id', productId).single();
      if (readError) throw readError;
      const units = product.units || [];
      if (units.some(existing => existing.id === unit.id)) return units;
      if (units.some(existing => existing.name?.trim().toLowerCase() === unit.name.toLowerCase())) {
        throw new Error('This product already has a type with that name.');
      }
      // Update only the list we just read so a concurrent edit cannot be overwritten.
      const update = supabase.from('products').update({ units: [...units, unit] })
        .eq('store_id', storeId).eq('id', productId);
      const unchanged = product.units == null ? update.is('units', null) : update.eq('units', JSON.stringify(product.units));
      const { data, error } = await unchanged.select('units').maybeSingle();
      if (error) throw error;
      if (data) return data.units;
    }
    throw new Error('The product changed while saving. Please try again.');
  },

  updateUnitPrice: async (storeId, productId, unitName, priceType, price) => {
    const priceField = priceType === 'purchase' ? 'defaultPurchasePrice' : 'defaultSalePrice';
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: product, error: readError } = await supabase
        .from('products').select('units').eq('store_id', storeId).eq('id', productId).single();
      if (readError) throw readError;
      const units = product.units || [];
      const unitIndex = units.findIndex(unit => unit.name?.trim().toLowerCase() === unitName?.trim().toLowerCase());
      if (unitIndex < 0) throw new Error('This product type is no longer available.');
      if (Number(units[unitIndex][priceField]) === Number(price)) return units;

      const updatedUnits = units.map((unit, index) => index === unitIndex ? { ...unit, [priceField]: Number(price) } : unit);
      const update = supabase.from('products').update({ units: updatedUnits })
        .eq('store_id', storeId).eq('id', productId);
      const unchanged = product.units == null ? update.is('units', null) : update.eq('units', JSON.stringify(product.units));
      const { data, error } = await unchanged.select('units').maybeSingle();
      if (error) throw error;
      if (data) return data.units;
    }
    throw new Error('The product changed while saving. Please try again.');
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
};
