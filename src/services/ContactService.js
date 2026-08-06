import { db } from '../database/db';

export const ContactService = {

  // 1. GET ALL CONTACTS
  getAll: async (storeId, type) => {
    // Fetch by storeId first
    let contacts = await db.contacts.where('storeId').equals(storeId).toArray();
    
    // Filter by type in memory if provided
    if (type) {
      contacts = contacts.filter(c => c.type === type);
    }
    
    // Sort: Active first, then by highest balance (most debt first)
    return contacts.sort((a, b) => {
      if (a.isArchived !== b.isArchived) return a.isArchived ? 1 : -1;
      return b.balance - a.balance; 
    });
  },

  // 2. GET SINGLE CONTACT
  getById: async (contactId) => {
    return await db.contacts.get(contactId);
  },

  // 3. CREATE CONTACT
  create: async (storeId, contactData) => {
    const newContact = {
      id: 'contact_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      storeId,
      name: contactData.name.trim(),
      phone: contactData.phone || '',
      type: contactData.type, // Must be 'customer' or 'supplier'
      balance: 0,
      isArchived: false,
      createdAt: new Date().toISOString()
    };

    await db.contacts.add(newContact);
    return newContact.id;
  },

  // 4. UPDATE CONTACT DETAILS
  update: async (contactId, updateData) => {
    await db.contacts.update(contactId, updateData);
  },

  // 5. ARCHIVE / RESTORE CONTACT
  archive: async (contactId) => {
    await db.contacts.update(contactId, { isArchived: true });
  },

  restore: async (contactId) => {
    await db.contacts.update(contactId, { isArchived: false });
  },

  // 6. CALCULATE BALANCE (The Truth Engine)
  calculateBalance: async (contactId) => {
    const transactions = await db.transactions.where('contactId').equals(contactId).toArray();
    
    let totalAmount = 0;
    let totalPaid = 0;

    transactions.forEach(tx => {
      if (!tx.isVoid) {
        totalAmount += parseFloat(tx.amount) || 0;
        totalPaid += parseFloat(tx.paid) || 0;
      }
    });

    return totalAmount - totalPaid;
  },

  // 7. UPDATE BALANCE ON CONTACT RECORD
  updateBalance: async (contactId) => {
    const newBalance = await ContactService.calculateBalance(contactId);
    await db.contacts.update(contactId, { balance: newBalance });
    return newBalance;
  }
};