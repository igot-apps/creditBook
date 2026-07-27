import { db } from '../database/db';

export const CustomerRepository = {
  getAll: async () => await db.customers.toArray(),
  
  getById: async (id) => {
    if (!id) return null;
    return await db.customers.get(id);
  },
  
  add: async (customer) => await db.customers.add(customer),
  update: async (id, updates) => await db.customers.update(id, updates),
  delete: async (id) => await db.customers.delete(id)
};