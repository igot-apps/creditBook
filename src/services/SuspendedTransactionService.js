import { db } from '../database/db';

export const SuspendedTransactionService = {
  
  // 1. SUSPEND (Create or Update)
  suspendTransaction: async (data) => {
    const now = new Date().toISOString();
    
    // If an ID is provided, we are updating an existing suspended record
    if (data.id) {
      await db.suspendedTransactions.update(data.id, {
        ...data,
        updatedAt: now
      });
      return data.id;
    } 
    
    // Otherwise, create a new suspended record
    const newId = 'susp_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    const record = {
      id: newId,
      storeId: data.storeId,
      type: data.type, // 'sale' or 'purchase'
      contactId: data.contactId,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      items: data.items || [],
      amount: data.amount || 0,
      paid: data.paid || 0,
      discount: data.discount || 0,
      note: data.note || '',
      createdAt: now,
      updatedAt: now
    };
    
    await db.suspendedTransactions.add(record);
    return newId;
  },

  // 2. GET ALL FOR STORE (For the Home Page)
  getSuspendedTransactions: async (storeId) => {
    return await db.suspendedTransactions
      .where('storeId')
      .equals(storeId)
      .reverse()
      .sortBy('createdAt'); // Newest first
  },

  // 3. CHECK DUPLICATE (For Duplicate Protection)
  getSuspendedByContact: async (storeId, contactId, type) => {
    return await db.suspendedTransactions
      .where({ storeId, contactId, type })
      .first();
  },

  // 4. DELETE (When Sale/Purchase is Completed)
  deleteSuspendedTransaction: async (id) => {
    await db.suspendedTransactions.delete(id);
  },

  // 5. CLEANUP (Remove records older than 7 days)
  cleanupOldSuspended: async (storeId) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString();

    const oldRecords = await db.suspendedTransactions
      .where('storeId')
      .equals(storeId)
      .and(tx => tx.createdAt < cutoff)
      .toArray();

    if (oldRecords.length > 0) {
      await db.suspendedTransactions.bulkDelete(oldRecords.map(r => r.id));
      console.log(`Cleaned up ${oldRecords.length} old suspended transactions.`);
    }
  },

  // 6. GET COUNT (To enforce limits if needed)
  getCount: async (storeId) => {
    return await db.suspendedTransactions
      .where('storeId')
      .equals(storeId)
      .count();
  }
};