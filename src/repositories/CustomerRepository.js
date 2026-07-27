import { db } from '../database/db';

export const CustomerRepository = {
  getAll: async (storeId) => await db.customers.where('storeId').equals(storeId).toArray(),
  
  getById: async (storeId, id) => {
    if (!id) return null;
    return await db.customers.where({ storeId, id }).first();
  },
  
  add: async (storeId, customerData) => {
    return await db.customers.add({ storeId, ...customerData });
  },
  
  update: async (storeId, id, updates) => {
    return await db.customers.where({ storeId, id }).modify(updates);
  },
  
  delete: async (storeId, id) => {
    await db.transactions.where({ storeId, customerId: id }).delete();
    return await db.customers.where({ storeId, id }).delete();
  }
};