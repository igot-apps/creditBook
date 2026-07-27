import { CustomerRepository } from '../repositories/CustomerRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';

export const CustomerService = {
  getAllWithHistory: async () => {
    const customers = await CustomerRepository.getAll();
    
    const enrichedCustomers = await Promise.all(customers.map(async (c) => {
      const history = await TransactionRepository.getByCustomerId(c.id);
      const balance = history.reduce((sum, t) => sum + (t.amount || 0) - (t.paid || 0), 0);
      return { ...c, history, balance };
    }));

    return enrichedCustomers;
  },

  addTransaction: async (customerId, customerName, customerPhone, amount, paid, items) => {
    let targetCustomer = null;
    
    if (customerId) {
      targetCustomer = await CustomerRepository.getById(customerId);
    }
    
    if (!targetCustomer) {
      const newId = await CustomerRepository.add({
        name: customerName,
        phone: customerPhone,
        joined: new Date().toISOString()
      });
      targetCustomer = await CustomerRepository.getById(newId);
    }

    const history = await TransactionRepository.getByCustomerId(targetCustomer.id);
    const prevBalance = history.reduce((sum, t) => sum + (t.amount || 0) - (t.paid || 0), 0);
    const newBalance = prevBalance + amount - paid; // Allows negative for credit

    const newTx = {
      customerId: targetCustomer.id,
      date: new Date().toISOString(),
      amount,
      paid,
      items: items || 'General Purchase',
      prevBalance,
      newBalance
    };
    
    await TransactionRepository.add(newTx);

    const updatedHistory = await TransactionRepository.getByCustomerId(targetCustomer.id);
    return { ...targetCustomer, history: updatedHistory, balance: newBalance };
  },

  clearDebt: async (customerId) => {
    if (!customerId) return null;
    
    const customer = await CustomerRepository.getById(customerId);
    if (!customer) return null;
    
    const history = await TransactionRepository.getByCustomerId(customerId);
    const currentBalance = history.reduce((sum, t) => sum + (t.amount || 0) - (t.paid || 0), 0);

    if (currentBalance <= 0) return null;

    const clearanceTx = {
      customerId,
      date: new Date().toISOString(),
      amount: 0,
      paid: currentBalance,
      items: 'Balance clearance',
      prevBalance: currentBalance,
      newBalance: 0
    };

    await TransactionRepository.add(clearanceTx);
    
    const updatedHistory = await TransactionRepository.getByCustomerId(customerId);
    return { ...customer, history: updatedHistory, balance: 0 };
  }
};