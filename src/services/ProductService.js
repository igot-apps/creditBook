import { db } from '../database/db';

export const ProductService = {

  // 1. GET ALL PRODUCTS
  getAll: async (storeId) => {
    return await db.products.where('storeId').equals(storeId).toArray();
  },

  // 2. SMART SEARCH (The Core UX Engine)
  // Ranks products by: 1. Favourites -> 2. Most Used -> 3. Alphabetical
  search: async (storeId, query) => {
    const allProducts = await db.products.where('storeId').equals(storeId).toArray();
    
    if (!query || !query.trim()) {
      // If no query, return top 10 favourites and most used
      return allProducts
        .sort((a, b) => {
          if (a.isFavourite !== b.isFavourite) return b.isFavourite ? 1 : -1;
          return (b.usageCount || 0) - (a.usageCount || 0);
        })
        .slice(0, 15);
    }
    
    const q = query.toLowerCase();
    
    // Filter by Name, Category, Brand, or Unit Name
    const filtered = allProducts.filter(p => {
      const matchesName = p.name && p.name.toLowerCase().includes(q);
      const matchesCategory = p.category && p.category.toLowerCase().includes(q);
      const matchesBrand = p.brand && p.brand.toLowerCase().includes(q);
      const matchesUnit = p.units && p.units.some(u => u.name.toLowerCase().includes(q));
      
      return matchesName || matchesCategory || matchesBrand || matchesUnit;
    });

    // Apply Smart Ranking
    return filtered.sort((a, b) => {
      if (a.isFavourite !== b.isFavourite) return b.isFavourite ? 1 : -1;
      if ((b.usageCount || 0) !== (a.usageCount || 0)) return (b.usageCount || 0) - (a.usageCount || 0);
      return (a.name || '').localeCompare(b.name || '');
    });
  },

  // 3. CREATE PRODUCT (Template)
  create: async (storeId, productData) => {
    // Ensure the units array is properly formatted
    const units = (productData.units || []).map((u, index) => ({
      id: u.id || `u_${Date.now()}_${index}`,
      name: (u.name || 'Piece').trim(),
      defaultPurchasePrice: parseFloat(u.defaultPurchasePrice || u.purchasePrice) || 0,
      defaultSalePrice: parseFloat(u.defaultSalePrice || u.salePrice) || 0
    }));

    // Fallback for legacy single-unit data
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
      createdAt: new Date().toISOString()
    };

    await db.products.add(newProduct);
    return newProduct.id;
  },

  // 4. UPDATE PRODUCT
  // Updates defaults only. Never touches historical transactions.
  update: async (productId, updateData) => {
    await db.products.update(productId, updateData);
  },

  // 5. DELETE PRODUCT
  delete: async (productId) => {
    await db.products.delete(productId);
  },

  // 6. TRACK USAGE
  // Increments usage count to help prioritize items in search results
  trackUsage: async (productId) => {
    const product = await db.products.get(productId);
    if (product) {
      await db.products.update(productId, { 
        usageCount: (product.usageCount || 0) + 1 
      });
    }
  },

  // 7. GET SINGLE PRODUCT
  getById: async (productId) => {
    return await db.products.get(productId);
  },

  // 8. TOGGLE FAVOURITE
  toggleFavourite: async (productId) => {
    const product = await db.products.get(productId);
    if (product) {
      await db.products.update(productId, { 
        isFavourite: !product.isFavourite 
      });
    }
  }
};