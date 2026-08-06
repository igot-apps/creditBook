import { db } from '../database/db';
import { ContactService } from './ContactService';

export const TransactionService = {

  // 1. GET ALL TRANSACTIONS
  // Can filter by store, contact, or type ('sale' | 'purchase')
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
    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  // 2. GET SINGLE TRANSACTION
  getById: async (txId) => {
    return await db.transactions.get(txId);
  },

  // 3. CREATE TRANSACTION (The Immutable Fact)
  // Saves exactly what happened. Never references current product defaults.
  create: async (storeId, contactId, type, items, amount, paid, note) => {
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      storeId,
      contactId,
      type, // 'sale' or 'purchase'
      items: items || [], // Array of { name, unitName, quantity, unitPrice, total }
      amount: parseFloat(amount) || 0,
      paid: parseFloat(paid) || 0,
      note: note || '',
      date: new Date().toISOString(),
      isVoid: false,
      voidReason: null
    };

    await db.transactions.add(newTx);

    // Automatically recalculate and update the contact's balance
    await ContactService.updateBalance(contactId);

    return newTx.id;
  },

  // 4. VOID (CANCEL) TRANSACTION
  // Marks as void and provides a reason. Does NOT delete the record.
  voidTransaction: async (txId, reason) => {
    const tx = await db.transactions.get(txId);
    if (!tx) throw new Error("Transaction not found");

    await db.transactions.update(txId, {
      isVoid: true,
      voidReason: reason || 'No reason provided',
      voidedAt: new Date().toISOString()
    });

    // Recalculate balance to remove the impact of this transaction
    await ContactService.updateBalance(tx.contactId);
  },

  // 5. REDO (RESTORE) TRANSACTION
  // Brings a voided transaction back to life.
  redoTransaction: async (txId) => {
    const tx = await db.transactions.get(txId);
    if (!tx) throw new Error("Transaction not found");

    await db.transactions.update(txId, {
      isVoid: false,
      voidReason: null,
      voidedAt: null
    });

    // Recalculate balance to re-apply the impact
    await ContactService.updateBalance(tx.contactId);
  },

  // 6. GET HISTORY FOR A CONTACT
  // Used by Profile pages to show the timeline of sales/purchases
  getHistory: async (contactId) => {
    const transactions = await db.transactions.where('contactId').equals(contactId).toArray();
    return transactions.sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first for timeline
  }
};