import { ProductRepository } from '../repositories/ProductRepository';

export const ProductService = {
  getAll: async (storeId, includeArchived = false) => {
    const all = await ProductRepository.getAll(storeId);
    return includeArchived ? all : all.filter(p => p.isActive !== false);
  },

  create: async (storeId, data) => {
    return await ProductRepository.add({ 
      storeId, 
      isActive: true, 
      usageCount: 0, 
      isFavourite: false,
      ...data 
    });
  },

  update: async (id, data) => {
    return await ProductRepository.update(id, data);
  },

  archive: async (id) => ProductRepository.archive(id),
  
  restore: async (id) => ProductRepository.restore(id),
  
  trackUsage: async (id) => ProductRepository.incrementUsage(id)
};