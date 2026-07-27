import { CustomerRepository } from '../repositories/CustomerRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';

export const CustomerService = {
  getAllWithHistory: async (storeId) => {
    const customers = await CustomerRepository.getAll(storeId);
    
    const enriched = await Promise.all(customers.map(async (c) => {
      const history = await TransactionRepository.getByCustomerId(storeId, c.id);
      const balance = history.reduce((sum, t) => sum + (t.amount || 0) - (t.paid || 0), 0);
      return { ...c, history, balance };
    }));

    return enriched;
  },

  addTransaction: async (storeId, customerId, customerName, customerPhone, amount, paid, items) => {
    let targetCustomer = null;
    
    if (customerId) {
      // Existing customer selected from search/profile
      targetCustomer = await CustomerRepository.getById(storeId, customerId);
    } else {
      // 👇 NEW CUSTOMER FLOW: Check if phone already exists
      const existingCustomer = await CustomerRepository.getByPhone(storeId, customerPhone);
      
      if (existingCustomer) {
        // Block creation and throw a clear error
        throw new Error(`A customer with the phone number "${customerPhone}" already exists.`);
      }
      
      // If unique, create the new customer
      const newId = await CustomerRepository.add(storeId, {
        name: customerName,
        phone: customerPhone,
        joined: new Date().toISOString()
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
      prevBalance,
      newBalance
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
      newBalance: 0
    });
    
    const updatedHistory = await TransactionRepository.getByCustomerId(storeId, customerId);
    return { ...customer, history: updatedHistory, balance: 0 };
  },

  updateCustomer: async (storeId, customerId, updates) => {
    await CustomerRepository.update(storeId, customerId, updates);
    return await CustomerRepository.getById(storeId, customerId);
  },

  deleteCustomer: async (storeId, customerId) => {
    await CustomerRepository.delete(storeId, customerId);
    return true;
  }
};