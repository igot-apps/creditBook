import { CustomerRepository } from '../repositories/CustomerRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { db } from '../database/db';

export const CustomerService = {
  getAllWithHistory: async (storeId, includeArchived = false) => {
    // 1. Fetch all customers for this store (avoids compound index errors)
    const allCustomers = await db.customers.where('storeId').equals(storeId).toArray();
    
    // 2. Filter in memory (treats undefined or missing isArchived as false)
    const filtered = includeArchived 
      ? allCustomers 
      : allCustomers.filter(c => c.isArchived !== true);
    
    // 3. Enrich with transaction history
    const enriched = await Promise.all(filtered.map(async (c) => {
      const history = await TransactionRepository.getByCustomerId(storeId, c.id);
      const balance = history.reduce((sum, t) => sum + (t.amount || 0) - (t.paid || 0), 0);
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
        isArchived: false
      });
      targetCustomer = await CustomerRepository.getById(storeId, newId);
    }

    const history = await TransactionRepository.getByCustomerId(storeId, targetCustomer.id);
    const prevBalance = history.reduce((sum, t) => sum + (t.amount || 0) - (t.paid || 0), 0);
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
    const currentBalance = history.reduce((sum, t) => sum + (t.amount || 0) - (t.paid || 0), 0);

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

  archiveCustomer: async (storeId, customerId) => {
    await CustomerRepository.update(storeId, customerId, { isArchived: true });
    return true;
  },

  restoreCustomer: async (storeId, customerId) => {
    await CustomerRepository.update(storeId, customerId, { isArchived: false });
    return true;
  },

  voidTransaction: async (storeId, customerId, transactionId) => {
    const history = await TransactionRepository.getByCustomerId(storeId, customerId);
    const originalTx = history.find(t => t.id === transactionId);
    if (!originalTx) return null;

    const voidTx = {
      customerId,
      date: new Date().toISOString(),
      amount: -originalTx.amount,
      paid: -originalTx.paid,
      items: `VOIDED: ${originalTx.items || 'General Purchase'}`,
      invoiceItems: originalTx.invoiceItems ? originalTx.invoiceItems.map(i => ({...i, quantity: -i.quantity, total: -i.total})) : null,
      mode: originalTx.mode,
      prevBalance: 0,
      newBalance: 0,
      isVoid: true
    };

    await TransactionRepository.add(storeId, voidTx);
    const updatedHistory = await TransactionRepository.getByCustomerId(storeId, customerId);
    const customer = await CustomerRepository.getById(storeId, customerId);
    const newBalance = updatedHistory.reduce((sum, t) => sum + (t.amount || 0) - (t.paid || 0), 0);
    
    return { ...customer, history: updatedHistory, balance: newBalance };
  }
};