import { db } from '../database/db';

export const StoreRepository = {
  get: async () => {
    const stores = await db.store.toArray();
    return stores.length > 0 ? stores[0] : null;
  },
  save: async (storeData) => {
    const existing = await StoreRepository.get();
    if (existing) {
      return await db.store.update(existing.id, storeData);
    }
    return await db.store.add(storeData);
  }
};