import Dexie from 'dexie';

export const db = new Dexie('CreditBookSaaS');

// Version 6: Adds compound index for customers and fixes undefined isArchived values
db.version(6).stores({
  stores: '++id, name, ownerName, email, phone',
  // 👇 Added [storeId+isArchived] compound index for fast, warning-free queries
  customers: '++id, storeId, [storeId+isArchived], name, phone, altPhone, joined, isArchived, address, notes',
  transactions: '++id, storeId, customerId, [storeId+customerId], date, amount, paid, mode, isVoid',
  products: '++id, storeId, name, category, isActive, isFavourite, lastUsed, usageCount'
}).upgrade(async (trans) => {
  // Migration: Explicitly set isArchived to false for all existing customers
  await trans.customers.toCollection().modify(c => {
    if (c.isArchived === undefined) {
      c.isArchived = false;
    }
    c.address = c.address || "";
    c.notes = c.notes || "";
  });
});