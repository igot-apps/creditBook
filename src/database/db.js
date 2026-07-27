import Dexie from 'dexie';

export const db = new Dexie('CreditBookSaaS');

// Version 2 adds multi-tenancy (storeId) to all tables
db.version(2).stores({
  stores: 'id, name, ownerName, email, phone, password', // id is now a UUID
  customers: '++id, storeId, name, phone, joined',
  transactions: '++id, storeId, customerId, date, amount, paid, items, prevBalance, newBalance'
}).upgrade(trans => {
  // Migration: If upgrading from v1, we just clear to start fresh with SaaS structure
  // (In a real app, you'd map old data to a default storeId)
  return trans.stores.clear().then(() => trans.customers.clear()).then(() => trans.transactions.clear());
});