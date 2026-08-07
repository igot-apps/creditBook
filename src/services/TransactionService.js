import { db } from '../database/db';
import { ContactService } from './ContactService';

export const TransactionService = {

  // 1. GET ALL TRANSACTIONS
  getAll: async (storeId, filters = {}) => {
    let query = db.transactions.where('storeId').equals(storeId);
    
    if (filters.contactId) {
      query = query.where('contactId').equals(filters.contactId);
    }
    if (filters.type) {
      query = query.where('type').equals(filters.type);
    }

    const transactions = await query.toArray();
    
    // Sort by date descending (newest first)
    return transactions.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  },

  // 2. GET SINGLE TRANSACTION
  getById: async (txId) => {
    return await db.transactions.get(txId);
  },

  // 3. UPDATE TRANSACTION
  update: async (txId, updates) => {
    return await db.transactions.update(txId, updates);
  },

  // 4. CREATE TRANSACTION (The Immutable Fact)
  create: async (storeId, contactId, type, items, amount, paid, note, extraData = {}) => {
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      storeId,
      contactId,
      type, // 'sale' or 'purchase' or 'payment'
      items: items || [], 
      amount: parseFloat(amount) || 0,
      paid: parseFloat(paid) || 0,
      note: note || '',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      // 👇 NEW: Save contact details and fix reason for reliable restoration and audit trail
      contactName: extraData.contactName || null,
      contactPhone: extraData.contactPhone || null,
      fixReason: extraData.fixReason || null, 
      // 👇 FIELDS FOR FIX/CANCEL WORKFLOW
      status: extraData.status || 'active', 
      cancelReason: extraData.cancelReason || null,
      replacedByTransactionId: extraData.replacedByTransactionId || null,
      correctsTransactionId: extraData.correctsTransactionId || null
    };

    await db.transactions.add(newTx);

    // Automatically recalculate and update the contact's balance
    await ContactService.updateBalance(contactId);

    return newTx.id;
  },

  // 5. CANCEL TRANSACTION
  cancelTransaction: async (txId, reason) => {
    const tx = await db.transactions.get(txId);
    if (!tx) throw new Error("Transaction not found");

    await db.transactions.update(txId, {
      status: 'cancelled',
      cancelReason: reason || 'No reason provided',
      cancelledAt: new Date().toISOString()
    });

    // Recalculate balance to remove the impact of this transaction
    await ContactService.updateBalance(tx.contactId);
  },

  // 6. REDO (RESTORE) TRANSACTION
  redoTransaction: async (txId) => {
    const tx = await db.transactions.get(txId);
    if (!tx) throw new Error("Transaction not found");

    await db.transactions.update(txId, {
      status: 'active',
      cancelReason: null,
      cancelledAt: null
    });

    // Recalculate balance to re-apply the impact
    await ContactService.updateBalance(tx.contactId);
  },

  // 7. GET HISTORY FOR A CONTACT
  getHistory: async (contactId) => {
    const transactions = await db.transactions.where('contactId').equals(contactId).toArray();
    // Sort newest first for the timeline
    return transactions.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  },

  // 8. CALCULATE BALANCE (Ignores cancelled transactions)
  calculateBalance: async (contactId) => {
    const transactions = await db.transactions.where('contactId').equals(contactId).toArray();
    
    let totalAmount = 0;
    let totalPaid = 0;

    transactions.forEach(tx => {
      // 👇 CRITICAL: Ignore cancelled transactions for balance calculation
      if (tx.status !== 'cancelled') {
        totalAmount += parseFloat(tx.amount) || 0;
        totalPaid += parseFloat(tx.paid) || 0;
      }
    });

    return totalAmount - totalPaid;
  }
};