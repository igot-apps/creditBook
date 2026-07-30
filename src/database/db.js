import Dexie from 'dexie';

export const db = new Dexie('CreditBookDB');

db.version(1).stores({
  stores: '++id, createdAt',
  customers: '++id, storeId, phone, name',
  transactions: '++id, [storeId+customerId], date', 
  products: '++id, storeId, name'
});

db.version(2).stores({
  drafts: '++id, storeId, createdAt'
});

// 👇 NEW: Version 3 to add invoice number support
db.version(3).stores({
  transactions: '++id, [storeId+customerId], date, invoiceNumber',
  invoiceCounters: '++id, [storeId+year]' // Track invoice numbers per store per year
});