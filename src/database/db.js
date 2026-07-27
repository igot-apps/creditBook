import Dexie from 'dexie';

export const db = new Dexie('CreditBookSaaS');

// Version 3 adds the compound index for faster transaction lookups
// Note: 'stores' MUST be plural to match AuthService.js
db.version(3).stores({
  stores: '++id, name, ownerName, email, phone, password',
  customers: '++id, storeId, name, phone, joined',
  transactions: '++id, storeId, customerId, [storeId+customerId], date, amount, paid, items, prevBalance, newBalance'
});