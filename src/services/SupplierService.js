import { ContactService } from './ContactService';
import { TransactionService } from './TransactionService';

// BRIDGE: Routes old SupplierService calls to the new unified services.
export const SupplierService = {
  getAll: (storeId) => ContactService.getAll(storeId, 'supplier'),
  getById: (id) => ContactService.getById(id),
  
  addSupplier: (storeId, name, phone) => 
    ContactService.create(storeId, { name, phone, type: 'supplier' }),
    
  addTransaction: (storeId, supplierId, amount, paid, items, note) =>
    TransactionService.create(storeId, supplierId, 'purchase', items, amount, paid, note),
    
  getHistory: (supplierId) => TransactionService.getHistory(supplierId), // 👈 ADDED THIS
  
  clearDebt: async (storeId, supplierId) => {
    const contact = await ContactService.getById(supplierId);
    if (contact && contact.balance > 0) {
      await TransactionService.create(storeId, supplierId, 'purchase', [], 0, contact.balance, 'Balance cleared');
    }
  },
  
  voidTransaction: (txId, reason) => TransactionService.voidTransaction(txId, reason),
  redoTransaction: (txId) => TransactionService.redoTransaction(txId),
  updateBalance: (contactId) => ContactService.updateBalance(contactId)
};