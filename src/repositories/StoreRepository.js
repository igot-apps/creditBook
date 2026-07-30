import { db } from '../database/db';

export const StoreRepository = {
  getById: async (id) => {
    return await db.stores.get(id);
  },
  
  // 👇 ADD THIS UPDATE METHOD
  update: async (id, data) => {
    await db.stores.update(id, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return await db.stores.get(id);
  }
};