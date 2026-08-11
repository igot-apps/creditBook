import { db } from '../database/db';

export const AccountShareService = {
  
  // 1. GENERATE SHARE REFERENCE (e.g., REF-20260811-0042)
  generateShareReference: () => {
    const now = new Date();
    // Format date as YYYYMMDD
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ''); 
    // Generate a 4-digit random number
    const randomNum = Math.floor(1000 + Math.random() * 9000); 
    return `REF-${dateStr}-${randomNum}`;
  },

  // 2. LOG A SHARE EVENT (For the owner's memory)
  logShare: async (data) => {
    const record = {
      id: 'share_' + Date.now(),
      storeId: data.storeId,
      contactId: data.contactId,
      contactName: data.contactName,
      channel: data.channel, // 'whatsapp' or 'sms'
      scope: data.scope,     // 'balance', 'last5', 'last10', 'full'
      reference: data.reference,
      createdAt: new Date().toISOString()
    };
    await db.accountShares.add(record);
    return record;
  },

  // 3. FETCH SHARE HISTORY FOR A CONTACT
  // This allows the owner to see "I already sent this yesterday"
  getShareHistory: async (contactId) => {
    return await db.accountShares
      .where('contactId')
      .equals(contactId)
      .reverse()
      .sortBy('createdAt');
  },

  // 4. CLEANUP OLD SHARE LOGS (Prevent DB bloat)
  // Automatically removes logs older than 90 days
  cleanupOldShares: async (storeId) => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoff = ninetyDaysAgo.toISOString();

    const oldRecords = await db.accountShares
      .where('storeId')
      .equals(storeId)
      .and(share => share.createdAt < cutoff)
      .toArray();

    if (oldRecords.length > 0) {
      await db.accountShares.bulkDelete(oldRecords.map(r => r.id));
    }
  }
};