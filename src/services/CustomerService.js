import { CustomerRepository } from '../repositories/CustomerRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { db } from '../database/db';

export const CustomerService = {
  getAllWithHistory: async (storeId, includeArchived = false) => {
    const allCustomers = await db.customers.where('storeId').equals(storeId).toArray();
    
    const enriched = await Promise.all(allCustomers.map(async (c) => {
      const history = await TransactionRepository.getByCustomerId(storeId, c.id);
      const balance = history.reduce((sum, t) => {
        if (t.isVoid) return sum; 
        return sum + (t.amount || 0) - (t.paid || 0);
      }, 0);
      return { ...c, history, balance };
    }));

    return enriched;
  },

  addTransaction: async (storeId, customerId, customerName, customerPhone, amount, paid, items, invoiceItems = null) => {
    let targetCustomer = null;
    
    if (customerId) {
      targetCustomer = await CustomerRepository.getById(storeId, customerId);
    } else {
      const existingCustomer = await CustomerRepository.getByPhone(storeId, customerPhone);
      if (existingCustomer) {
        throw new Error(`A customer with the phone number "${customerPhone}" already exists.`);
      }
      const newId = await CustomerRepository.add(storeId, {
        name: customerName,
        phone: customerPhone,
        joined: new Date().toISOString(),
      });
      targetCustomer = await CustomerRepository.getById(storeId, newId);
    }

    const history = await TransactionRepository.getByCustomerId(storeId, targetCustomer.id);
    const prevBalance = history.reduce((sum, t) => {
      if (t.isVoid) return sum;
      return sum + (t.amount || 0) - (t.paid || 0);
    }, 0);
    
    const newBalance = prevBalance + amount - paid;

    const newTx = {
      customerId: targetCustomer.id,
      date: new Date().toISOString(),
      amount,
      paid,
      items: items || 'General Purchase',
      invoiceItems: invoiceItems,
      mode: invoiceItems ? 'detailed' : 'quick',
      prevBalance,
      newBalance,
      isVoid: false
    };
    
    await TransactionRepository.add(storeId, newTx);

    const updatedHistory = await TransactionRepository.getByCustomerId(storeId, targetCustomer.id);
    return { ...targetCustomer, history: updatedHistory, balance: newBalance };
  },

  clearDebt: async (storeId, customerId) => {
    const customer = await CustomerRepository.getById(storeId, customerId);
    if (!customer) return null;
    
    const history = await TransactionRepository.getByCustomerId(storeId, customerId);
    const currentBalance = history.reduce((sum, t) => {
      if (t.isVoid) return sum;
      return sum + (t.amount || 0) - (t.paid || 0);
    }, 0);

    if (currentBalance <= 0) return null;

    await TransactionRepository.add(storeId, {
      customerId,
      date: new Date().toISOString(),
      amount: 0,
      paid: currentBalance,
      items: 'Balance clearance',
      prevBalance: currentBalance,
      newBalance: 0,
      isVoid: false
    });
    
    const updatedHistory = await TransactionRepository.getByCustomerId(storeId, customerId);
    return { ...customer, history: updatedHistory, balance: 0 };
  },

  updateCustomer: async (storeId, customerId, updates) => {
    await CustomerRepository.update(storeId, customerId, updates);
    return await CustomerRepository.getById(storeId, customerId);
  },

  //  NEW: Actual Deletion (Removes customer and their transactions)
  deleteCustomer: async (storeId, customerId) => {
    // 1. Delete all transactions associated with this customer
    await db.transactions.where('customerId').equals(customerId).delete();
    // 2. Delete the customer record
    await db.customers.delete(customerId);
    return true;
  },

  voidTransaction: async (storeId, customerId, transactionId) => {
    await db.transactions.update(transactionId, { isVoid: true });

    const history = await TransactionRepository.getByCustomerId(storeId, customerId);
    const newBalance = history.reduce((sum, t) => {
      if (t.isVoid) return sum;
      return sum + (t.amount || 0) - (t.paid || 0);
    }, 0);

    const customer = await CustomerRepository.getById(storeId, customerId);
    return { ...customer, history, balance: newBalance };
  }
};