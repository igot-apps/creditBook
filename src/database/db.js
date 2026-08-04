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

db.version(3).stores({
  transactions: '++id, [storeId+customerId], date, invoiceNumber',
  invoiceCounters: '++id, [storeId+year]' 
});

db.version(4).stores({
  products: '++id, storeId, name, isActive, isFavourite'
});

// 👇 NEW: Version 5 for Suppliers
db.version(5).stores({
  suppliers: '++id, storeId, name, phone',
  supplierTransactions: '++id, storeId, supplierId, date' 
});