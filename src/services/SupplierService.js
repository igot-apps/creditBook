import { db } from '../database/db';
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
  
  getHistory: (supplierId) => TransactionService.getHistory(supplierId),
  
  clearDebt: async (storeId, supplierId) => {
    const contact = await ContactService.getById(supplierId);
    if (contact && contact.balance > 0) {
      await TransactionService.create(storeId, supplierId, 'purchase', [], 0, contact.balance, 'Balance cleared');
    }
  },
  
  voidTransaction: (txId, reason) => TransactionService.voidTransaction(txId, reason),
  
  redoTransaction: (txId) => TransactionService.redoTransaction(txId),
  
  // ==========================================
  // UPDATED: Single Source of Truth Balance Calculation
  // ==========================================
  updateBalance: async (supplierId) => {
    // Fetch all transactions for this supplier
    const txs = await db.transactions.where({ contactId: supplierId }).toArray();
    
    // Filter active transactions
    const activePurchases = txs.filter(t => t.type === 'purchase' && t.status === 'active');
    const activePayments = txs.filter(t => t.type === 'supplier_payment' && t.status === 'active');
    
    // Calculate totals
    const totalPurchasesAmount = activePurchases.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const totalUpfrontPaid = activePurchases.reduce((sum, t) => sum + (parseFloat(t.paid) || 0), 0);
    const totalStandalonePayments = activePayments.reduce((sum, t) => sum + (parseFloat(t.paid) || 0), 0);
    
    // The Golden Formula: Purchases - Upfront Paid - Standalone Payments
    const newBalance = totalPurchasesAmount - totalUpfrontPaid - totalStandalonePayments;
    
    // Update the supplier record
    await db.suppliers.update(supplierId, { 
      balance: newBalance,
      lastActivity: new Date().toISOString()
    });
    
    return newBalance;
  }
};