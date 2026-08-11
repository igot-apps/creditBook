import { db } from '../database/db';

export const CustomerService = {
  getAll: async (storeId) => {
    return await db.contacts.where({ storeId, type: 'customer' }).toArray();
  },

  getById: async (id) => {
    return await db.contacts.get(id);
  },

  addCustomer: async (storeId, name, phone) => {
    const newCustomer = {
      storeId,
      type: 'customer',
      name,
      phone: phone || '',
      balance: 0,
      isArchived: false,
      createdAt: new Date().toISOString()
    };
    return await db.contacts.add(newCustomer);
  },

  // 👇 ADDED: Update method for editing existing customers
  update: async (id, data) => {
    await db.contacts.update(id, data);
  },

  updateBalance: async (id) => {
    const transactions = await db.transactions.where({ contactId: id }).toArray();
    let balance = 0;
    
    transactions.forEach(tx => {
      const isActive = tx.status === 'active' || !tx.status;
      if (!isActive) return;
      
      if (tx.type === 'sale') {
        balance += (parseFloat(tx.amount) || 0) - (parseFloat(tx.paid) || 0);
      } else if (tx.type === 'payment') {
        balance -= (parseFloat(tx.paid) || 0);
      }
    });
    
    await db.contacts.update(id, { balance });
    return balance;
  }
};