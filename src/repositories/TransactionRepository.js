import { db } from '../database/db';

export const TransactionRepository = {
  getByCustomerId: async (customerId) => {
    return await db.transactions.where('customerId').equals(customerId).sortBy('date');
  },
  add: async (transaction) => await db.transactions.add(transaction),
  getAll: async () => await db.transactions.toArray()
};