import { db } from '../database/db';

export const ProductRepository = {
  getAll: async (storeId) => await db.products.where('storeId').equals(storeId).toArray(),
  
  getById: async (id) => await db.products.get(id),
  
  add: async (productData) => await db.products.add(productData),
  
  update: async (id, updates) => await db.products.update(id, updates),
  
  archive: async (id) => await db.products.update(id, { isActive: false }),
  
  restore: async (id) => await db.products.update(id, { isActive: true }),
  
  // Track how often a product is used for the "Frequently Used" feature
  incrementUsage: async (id) => {
    const product = await db.products.get(id);
    if (product) {
      await db.products.update(id, {
        usageCount: (product.usageCount || 0) + 1,
        lastUsed: new Date().toISOString()
      });
    }
  }
};