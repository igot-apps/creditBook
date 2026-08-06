import Dexie from 'dexie';

export const db = new Dexie('CreditBookDB');

// Version 1: The old schema (Required for Dexie to know what to migrate FROM)
db.version(1).stores({
  stores: 'id, name, ownerName, email, phone, createdAt',
  customers: 'id, storeId, name, phone, balance, isArchived, createdAt',
  suppliers: 'id, storeId, name, phone, balance, isArchived, createdAt',
  products: 'id, storeId, name, price, unit, isFavourite, createdAt',
  customerTransactions: 'id, storeId, customerId, amount, paid, date, isVoid',
  supplierTransactions: 'id, storeId, supplierId, amount, paid, date, isVoid',
  drafts: 'id, storeId, isAuto, createdAt, updatedAt'
});

// Version 2: The new CreditBook V1 schema
db.version(2).stores({
  stores: 'id, name, ownerName, email, phone, currency, createdAt',
  
  // Unified contacts table
  contacts: 'id, storeId, name, phone, type, balance, isArchived, createdAt',
  
  // Inventory-free products
  products: 'id, storeId, name, category, brand, isFavourite, usageCount, createdAt',
  
  // Unified transactions
  transactions: 'id, storeId, contactId, type, amount, paid, date, isVoid',
  
  drafts: 'id, storeId, isAuto, createdAt, updatedAt'
}).upgrade(async (trans) => {
  // 1. Migrate Customers -> Contacts
  const oldCustomers = await trans.table('customers').toArray();
  await trans.table('contacts').bulkAdd(oldCustomers.map(c => ({
    ...c,
    type: 'customer'
  })));

  // 2. Migrate Suppliers -> Contacts
  const oldSuppliers = await trans.table('suppliers').toArray();
  await trans.table('contacts').bulkAdd(oldSuppliers.map(s => ({
    ...s,
    type: 'supplier'
  })));

  // 3. Migrate Products (Convert single price to units array)
  const oldProducts = await trans.table('products').toArray();
  await trans.table('products').bulkPut(oldProducts.map(p => {
    if (!p.units || p.units.length === 0) {
      p.units = [{
        id: 'u_default',
        name: p.unit || 'Piece',
        defaultPurchasePrice: p.defaultPurchasePrice || p.price || 0,
        defaultSalePrice: p.defaultSalePrice || p.price || 0
      }];
    }
    // Initialize new fields
    p.usageCount = p.usageCount || 0;
    p.category = p.category || '';
    p.brand = p.brand || '';
    return p;
  }));

  // 4. Migrate Customer Transactions -> Unified Transactions
  const oldCustTxs = await trans.table('customerTransactions').toArray();
  await trans.table('transactions').bulkAdd(oldCustTxs.map(tx => ({
    ...tx,
    contactId: tx.customerId, // Map old field to new field
    type: 'sale'
  })));

  // 5. Migrate Supplier Transactions -> Unified Transactions
  const oldSuppTxs = await trans.table('supplierTransactions').toArray();
  await trans.table('transactions').bulkAdd(oldSuppTxs.map(tx => ({
    ...tx,
    contactId: tx.supplierId, // Map old field to new field
    type: 'purchase'
  })));
});