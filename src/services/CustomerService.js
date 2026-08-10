import { db } from "../database/db";
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
  updateBalance: async (customerId) => {
    // Fetch all transactions for this customer
    const txs = await db.transactions.where({ contactId: customerId }).toArray();
    
    // Filter active transactions
    const activeSales = txs.filter(t => t.type === 'sale' && t.status === 'active');
    const activePayments = txs.filter(t => t.type === 'payment' && t.status === 'active');
    
    // Calculate totals
    const totalSalesAmount = activeSales.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const totalUpfrontPaid = activeSales.reduce((sum, t) => sum + (parseFloat(t.paid) || 0), 0);
    const totalStandalonePayments = activePayments.reduce((sum, t) => sum + (parseFloat(t.paid) || 0), 0);
    
    // The Golden Formula: Sales - Upfront Paid - Standalone Payments
    const newBalance = totalSalesAmount - totalUpfrontPaid - totalStandalonePayments;
    
    // Update the customer record
    await db.customers.update(customerId, { 
      balance: newBalance,
      lastActivity: new Date().toISOString() // Keep the "Recently Active" logic working
    });
    
    return newBalance;
  },
};