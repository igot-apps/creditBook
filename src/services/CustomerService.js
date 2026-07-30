import { CustomerRepository } from '../repositories/CustomerRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { db } from '../database/db';
import { generateInvoiceNumber } from '../utils/invoiceGenerator'; // 👈 NEW: Import the generator

export const CustomerService = {
  // 1. Get all customers and calculate their live balance (Ignoring voided transactions)
  getAllWithHistory: async (storeId, includeArchived = false) => {
    const allCustomers = await db.customers.where('storeId').equals(storeId).toArray();
    const filtered = includeArchived 
      ? allCustomers 
      : allCustomers.filter(c => c.isArchived !== true);
    
    const enriched = await Promise.all(filtered.map(async (c) => {
      const history = await TransactionRepository.getByCustomerId(storeId, c.id);
      
      // 👇 CRITICAL: Ignore voided transactions when calculating the live balance
      const balance = history.reduce((sum, t) => {
        if (t.isVoid) return sum; 
        return sum + (t.amount || 0) - (t.paid || 0);
      }, 0);

      return { ...c, history, balance };
    }));

    return enriched;
  },

  // 2. Add a new transaction (Purchase or Payment)
  addTransaction: async (storeId, customerId, customerName, customerPhone, amount, paid, items, invoiceItems = null) => {
    let targetCustomer = null;
    
    if (customerId) {
      targetCustomer = await CustomerRepository.getById(storeId, customerId);
    } else {
      // Create new customer on the fly if they don't exist
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
    const prevBalance = history.reduce((sum, t) => {
      if (t.isVoid) return sum;
      return sum + (t.amount || 0) - (t.paid || 0);
    }, 0);
    
    const newBalance = prevBalance + amount - paid;

    // 👇 NEW: Generate human-readable invoice number (e.g., "INV-2024-001")
    const invoiceNumber = await generateInvoiceNumber(storeId);

    const newTx = {
      customerId: targetCustomer.id,
      storeId: storeId, // Ensure storeId is saved for querying
      date: new Date().toISOString(),
      amount,
      paid,
      items: items || 'General Purchase',
      invoiceItems: invoiceItems,
      mode: invoiceItems ? 'detailed' : 'quick',
      prevBalance,
      newBalance,
      isVoid: false,
      invoiceNumber: invoiceNumber // 👈 NEW: Save the invoice number
    };
    
    await TransactionRepository.add(storeId, newTx);

    const updatedHistory = await TransactionRepository.getByCustomerId(storeId, targetCustomer.id);
    return { ...targetCustomer, history: updatedHistory, balance: newBalance };
  },

  // 3. Clear Debt (Creates a 0 amount, high paid transaction to zero out the balance)
  clearDebt: async (storeId, customerId) => {
    const customer = await CustomerRepository.getById(storeId, customerId);
    if (!customer) return null;
    
    const history = await TransactionRepository.getByCustomerId(storeId, customerId);
    const currentBalance = history.reduce((sum, t) => {
      if (t.isVoid) return sum;
      return sum + (t.amount || 0) - (t.paid || 0);
    }, 0);

    if (currentBalance <= 0) return null;

    const invoiceNumber = await generateInvoiceNumber(storeId); // 👈 NEW

    await TransactionRepository.add(storeId, {
      customerId,
      storeId: storeId,
      date: new Date().toISOString(),
      amount: 0,
      paid: currentBalance,
      items: 'Balance clearance',
      prevBalance: currentBalance,
      newBalance: 0,
      isVoid: false,
      invoiceNumber: invoiceNumber // 👈 NEW
    });
    
    const updatedHistory = await TransactionRepository.getByCustomerId(storeId, customerId);
    return { ...customer, history: updatedHistory, balance: 0 };
  },

  // 4. Update Customer Details (Name, Phone, Notes, etc.)
  updateCustomer: async (storeId, customerId, updates) => {
    await CustomerRepository.update(storeId, customerId, updates);
    return await CustomerRepository.getById(storeId, customerId);
  },

  // 5. REAL DELETION (Permanently wipes the customer and ALL their transaction history)
  deleteCustomer: async (storeId, customerId) => {
    // 1. Delete all transactions associated with this customer
    await db.transactions.where('customerId').equals(customerId).delete();
    // 2. Delete the customer record itself
    await db.customers.delete(customerId);
    return true;
  },

  // 6. VOID TRANSACTION (Flags as voided, keeps audit trail, recalculates balance)
  voidTransaction: async (storeId, customerId, transactionId) => {
    // 1. Mark the original transaction as voided in the database
    await db.transactions.update(transactionId, { isVoid: true });

    // 2. Recalculate the customer's balance ignoring voided items
    const history = await TransactionRepository.getByCustomerId(storeId, customerId);
    const newBalance = history.reduce((sum, t) => {
      if (t.isVoid) return sum;
      return sum + (t.amount || 0) - (t.paid || 0);
    }, 0);

    const customer = await CustomerRepository.getById(storeId, customerId);
    return { ...customer, history, balance: newBalance };
  }
};