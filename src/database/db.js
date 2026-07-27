import Dexie from 'dexie';

export const db = new Dexie('CreditBookDB');

// Define tables and indexes (mimicking a real database schema)
db.version(1).stores({
  store: '++id, name, owner, phone', // Singleton settings
  customers: '++id, name, phone, joined', // Indexed for fast search
  transactions: '++id, customerId, date, amount, paid, items, prevBalance, newBalance' // Indexed for querying by customer
});