import { ContactService } from './ContactService';
import { TransactionService } from './TransactionService';

// BRIDGE: Routes old CustomerService calls to the new unified services.
export const CustomerService = {
  getAll: (storeId) => ContactService.getAll(storeId, 'customer'),
  getById: (id) => ContactService.getById(id),
  
  addCustomer: (storeId, name, phone) => 
    ContactService.create(storeId, { name, phone, type: 'customer' }),
    
  addTransaction: (storeId, customerId, amount, paid, items, note) =>
    TransactionService.create(storeId, customerId, 'sale', items, amount, paid, note),
    
  getHistory: (customerId) => TransactionService.getHistory(customerId), // 👈 ADDED THIS
  
  clearDebt: async (storeId, customerId) => {
    const contact = await ContactService.getById(customerId);
    if (contact && contact.balance > 0) {
      await TransactionService.create(storeId, customerId, 'sale', [], 0, contact.balance, 'Balance cleared');
    }
  },
  
  voidTransaction: (txId, reason) => TransactionService.voidTransaction(txId, reason),
  redoTransaction: (txId) => TransactionService.redoTransaction(txId),
  updateBalance: (contactId) => ContactService.updateBalance(contactId)
};