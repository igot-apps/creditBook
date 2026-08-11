import Dexie from 'dexie';

export const db = new Dexie('CreditBookDB');

// Version 1: Legacy schema
db.version(1).stores({
  stores: 'id, name, ownerName, email, phone, createdAt',
  customers: 'id, storeId, name, phone, balance, isArchived, createdAt',
  suppliers: 'id, storeId, name, phone, balance, isArchived, createdAt',
  products: 'id, storeId, name, price, unit, isFavourite, createdAt',
  customerTransactions: 'id, storeId, customerId, amount, paid, date, isVoid',
  supplierTransactions: 'id, storeId, supplierId, amount, paid, date, isVoid',
  drafts: 'id, storeId, isAuto, createdAt, updatedAt'
});

// Version 2: First V1 Schema update
db.version(2).stores({
  stores: 'id, name, ownerName, email, phone, currency, createdAt',
  contacts: 'id, storeId, name, phone, type, balance, isArchived, createdAt',
  products: 'id, storeId, name, category, brand, isFavourite, usageCount, createdAt',
  transactions: 'id, storeId, contactId, type, amount, paid, date, isVoid',
  drafts: 'id, storeId, isAuto, createdAt, updatedAt'
}).upgrade(async (trans) => {
  const oldCustomers = await trans.table('customers').toArray();
  await trans.table('contacts').bulkAdd(oldCustomers.map(c => ({ ...c, type: 'customer' })));

  const oldSuppliers = await trans.table('suppliers').toArray();
  await trans.table('contacts').bulkAdd(oldSuppliers.map(s => ({ ...s, type: 'supplier' })));

  const oldProducts = await trans.table('products').toArray();
  await trans.table('products').bulkPut(oldProducts.map(p => {
    if (!p.units || p.units.length === 0) {
      p.units = [{ id: 'u_default', name: p.unit || 'Piece', defaultPurchasePrice: p.defaultPurchasePrice || p.price || 0, defaultSalePrice: p.defaultSalePrice || p.price || 0 }];
    }
    p.usageCount = p.usageCount || 0;
    p.category = p.category || '';
    p.brand = p.brand || '';
    return p;
  }));

  const oldCustTxs = await trans.table('customerTransactions').toArray();
  await trans.table('transactions').bulkAdd(oldCustTxs.map(tx => ({ ...tx, contactId: tx.customerId, type: 'sale' })));

  const oldSuppTxs = await trans.table('supplierTransactions').toArray();
  await trans.table('transactions').bulkAdd(oldSuppTxs.map(tx => ({ ...tx, contactId: tx.supplierId, type: 'purchase' })));
});

// Version 3: Ensure indexes are correct
db.version(3).stores({
  stores: 'id, name, ownerName, email, phone, currency, createdAt',
  contacts: 'id, storeId, name, phone, type, balance, isArchived, createdAt',
  products: 'id, storeId, name, category, brand, isFavourite, usageCount, createdAt',
  transactions: 'id, storeId, contactId, type, amount, paid, date, isVoid', 
  drafts: 'id, storeId, isAuto, createdAt, updatedAt'
});

// Version 4: Force refresh to fix SchemaError
db.version(4).stores({
  stores: '++id, name',
  contacts: '++id, storeId, type, name, phone, createdAt',
  products: '++id, storeId, name, category, brand, isFavourite, usageCount, lastUsedAt, createdAt',
  // 👇 NEW: Added indexes for status, replacedByTransactionId, correctsTransactionId
  transactions: '++id, storeId, contactId, type, status, replacedByTransactionId, correctsTransactionId, createdAt'
});

// Version 5: Add Suspended Transactions table
db.version(5).stores({
  stores: '++id, name',
  contacts: '++id, storeId, type, name, phone, createdAt',
  products: '++id, storeId, name, category, brand, isFavourite, usageCount, lastUsedAt, createdAt',
  transactions: '++id, storeId, contactId, type, status, replacedByTransactionId, correctsTransactionId, createdAt',
  // 👇 NEW: Dedicated table for suspended sales/purchases
  suspendedTransactions: '++id, storeId, contactId, type, createdAt'
});