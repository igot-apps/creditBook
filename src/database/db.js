import Dexie from 'dexie';

export const db = new Dexie('CreditBookSaaS');

// FINAL STABLE SCHEMA (Version 6)
// PRIMARY KEYS ARE '++id'. DO NOT CHANGE THESE.
// You can safely add new fields or new indexes (like [storeId+isArchived]) in future versions.
db.version(6).stores({
  stores: '++id, name, ownerName, email, phone',
  customers: '++id, storeId, [storeId+isArchived], name, phone, altPhone, joined, isArchived, address, notes',
  transactions: '++id, storeId, customerId, [storeId+customerId], date, amount, paid, mode, isVoid',
  products: '++id, storeId, name, category, isActive, isFavourite, lastUsed, usageCount'
}).upgrade(async (trans) => {
  // Safe migration: Ensure legacy data has the new fields
  await trans.customers.toCollection().modify(c => {
    if (c.isArchived === undefined) {
      c.isArchived = false;
    }
    c.address = c.address || "";
    c.notes = c.notes || "";
  });
});