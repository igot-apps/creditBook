import { db } from '../database/db';

export const TransactionRepository = {
  getByCustomerId: async (storeId, customerId) => {
    return await db.transactions.where({ storeId, customerId }).sortBy('date');
  },
  
  add: async (storeId, transactionData) => {
    return await db.transactions.add({ storeId, ...transactionData });
  },

  getAll: async (storeId) => {
    return await db.transactions.where('storeId').equals(storeId).toArray();
  }
};