import { db } from '../database/db';

// Emoji mapping for common categories (visual recognition)
export const CATEGORY_EMOJIS = {
  'rice': '🍚',
  'milk': '🥛',
  'drinks': '🥤',
  'beverages': '🥤',
  'oil': '🫒',
  'sugar': '🍬',
  'soap': '🧼',
  'biscuits': '🍪',
  'bread': '🍞',
  'frozen': '🧊',
  'medicine': '💊',
  'snacks': '🍿',
  'water': '💧',
  'meat': '🥩',
  'fish': '🐟',
  'chicken': '🍗',
  'eggs': '🥚',
  'fruit': '🍎',
  'fruits': '🍎',
  'vegetable': '🥬',
  'vegetables': '🥬',
  'spices': '🌶️',
  'grains': '🌾',
  'flour': '🌾',
  'pasta': '🍝',
  'tea': '🍵',
  'coffee': '☕',
  'cereal': '🥣',
  'sauce': '🥫',
  'cleaning': '🧹',
  'baby': '🍼',
  'default': '📦'
};

export const ProductService = {

  // Get emoji for a category
  getCategoryEmoji: (category) => {
    if (!category) return CATEGORY_EMOJIS.default;
    const key = category.toLowerCase().trim();
    return CATEGORY_EMOJIS[key] || CATEGORY_EMOJIS.default;
  },

  // 1. GET ALL PRODUCTS
  getAll: async (storeId) => {
    return await db.products.where('storeId').equals(storeId).toArray();
  },

  // 2. SMART SEARCH (For search mode)
  search: async (storeId, query) => {
    const allProducts = await db.products.where('storeId').equals(storeId).toArray();
    
    if (!query || !query.trim()) {
      return allProducts
        .sort((a, b) => {
          if (a.isFavourite !== b.isFavourite) return b.isFavourite ? 1 : -1;
          return (b.usageCount || 0) - (a.usageCount || 0);
        })
        .slice(0, 15);
    }
    
    const q = query.toLowerCase();
    
    const filtered = allProducts.filter(p => {
      const matchesName = p.name && p.name.toLowerCase().includes(q);
      const matchesCategory = p.category && p.category.toLowerCase().includes(q);
      const matchesBrand = p.brand && p.brand.toLowerCase().includes(q);
      const matchesUnit = p.units && p.units.some(u => u.name.toLowerCase().includes(q));
      const matchesLegacyName = p.name && p.name.toLowerCase().includes(q);
      
      return matchesName || matchesCategory || matchesBrand || matchesUnit || matchesLegacyName;
    });

    return filtered.sort((a, b) => {
      if (a.isFavourite !== b.isFavourite) return b.isFavourite ? 1 : -1;
      if ((b.usageCount || 0) !== (a.usageCount || 0)) return (b.usageCount || 0) - (a.usageCount || 0);
      return (a.name || '').localeCompare(b.name || '');
    });
  },

  // 3. GET FAVORITE PRODUCTS
  getFavorites: async (storeId) => {
    const allProducts = await db.products.where('storeId').equals(storeId).toArray();
    return allProducts
      .filter(p => p.isFavourite)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  },

  // 4. GET RECENTLY USED PRODUCTS
  // Returns products sorted by lastUsedAt (most recent first)
  getRecent: async (storeId, limit = 10) => {
    const allProducts = await db.products.where('storeId').equals(storeId).toArray();
    return allProducts
      .filter(p => p.lastUsedAt)
      .sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt))
      .slice(0, limit);
  },

  // 5. GET MOST USED PRODUCTS
  getMostUsed: async (storeId, limit = 10) => {
    const allProducts = await db.products.where('storeId').equals(storeId).toArray();
    return allProducts
      .filter(p => (p.usageCount || 0) > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, limit);
  },

  // 6. GET PRODUCTS BY CATEGORY
  getByCategory: async (storeId, category) => {
    const allProducts = await db.products.where('storeId').equals(storeId).toArray();
    if (!category || category === 'All') {
      return allProducts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return allProducts
      .filter(p => p.category && p.category.toLowerCase() === category.toLowerCase())
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  },

  // 7. GET ALL UNIQUE CATEGORIES
  getCategories: async (storeId) => {
    const allProducts = await db.products.where('storeId').equals(storeId).toArray();
    const categories = new Set();
    allProducts.forEach(p => {
      if (p.category && p.category.trim()) {
        categories.add(p.category.trim());
      }
    });
    return Array.from(categories).sort();
  },

  // 8. CREATE PRODUCT
  create: async (storeId, productData) => {
    const units = (productData.units || []).map((u, index) => ({
      id: u.id || `u_${Date.now()}_${index}`,
      name: (u.name || 'Piece').trim(),
      defaultPurchasePrice: parseFloat(u.defaultPurchasePrice || u.purchasePrice) || 0,
      defaultSalePrice: parseFloat(u.defaultSalePrice || u.salePrice) || 0
    }));

    if (units.length === 0 && productData.unit) {
      units.push({
        id: `u_${Date.now()}_0`,
        name: productData.unit,
        defaultPurchasePrice: parseFloat(productData.defaultPurchasePrice || productData.price) || 0,
        defaultSalePrice: parseFloat(productData.defaultSalePrice || productData.price) || 0
      });
    }

    const newProduct = {
      id: 'prod_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      storeId,
      name: productData.name || productData.brand || 'Unnamed Product',
      category: productData.category || '',
      brand: productData.brand || '',
      units: units,
      isFavourite: productData.isFavourite || false,
      usageCount: 0,
      lastUsedAt: null,
      createdAt: new Date().toISOString()
    };

    await db.products.add(newProduct);
    return newProduct.id;
  },

  // 9. UPDATE PRODUCT
  update: async (productId, updateData) => {
    await db.products.update(productId, updateData);
  },

  // 10. DELETE PRODUCT
  delete: async (productId) => {
    await db.products.delete(productId);
  },

  // 11. TRACK USAGE (Updated to also track lastUsedAt)
  trackUsage: async (productId) => {
    const product = await db.products.get(productId);
    if (product) {
      await db.products.update(productId, { 
        usageCount: (product.usageCount || 0) + 1,
        lastUsedAt: new Date().toISOString()
      });
    }
  },

  // 12. GET SINGLE PRODUCT
  getById: async (productId) => {
    return await db.products.get(productId);
  },

  // 13. TOGGLE FAVOURITE
  toggleFavourite: async (productId) => {
    const product = await db.products.get(productId);
    if (product) {
      await db.products.update(productId, { 
        isFavourite: !product.isFavourite 
      });
    }
  }
};