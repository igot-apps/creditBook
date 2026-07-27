import Dexie from 'dexie';

export const db = new Dexie('CreditBookDB');

db.version(1).stores({
  store: '++id, name, owner, phone',
  customers: '++id, name, phone, joined',
  transactions: '++id, customerId, date, amount, paid, items, prevBalance, newBalance'
});