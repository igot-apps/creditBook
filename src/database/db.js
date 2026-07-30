import Dexie from 'dexie';

export const db = new Dexie('CreditBookDB');

// Original Version 1
db.version(1).stores({
  stores: '++id, createdAt',
  customers: '++id, storeId, phone, name',
  transactions: '++id, [storeId+customerId], date', 
  products: '++id, storeId, name'
});

// 👇 NEW: Bump to Version 2 to add the drafts table
db.version(2).stores({
  drafts: '++id, storeId, createdAt'
});