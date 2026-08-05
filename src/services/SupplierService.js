import { db } from '../database/db';

export const SupplierService = {
  
  getAll: async (storeId) => {
    const suppliers = await db.suppliers.where('storeId').equals(storeId).toArray();
    const transactions = await db.supplierTransactions.where('storeId').equals(storeId).toArray();

    return suppliers.map(supplier => {
      const supplierTxs = transactions.filter(t => t.supplierId === supplier.id && !t.isVoid);
      
      const totalPurchases = supplierTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const totalPayments = supplierTxs.reduce((sum, t) => sum + (parseFloat(t.paid) || 0), 0);
      const balance = totalPurchases - totalPayments;

      return {
        ...supplier,
        balance,
        history: supplierTxs.sort((a, b) => new Date(a.date) - new Date(b.date)),
        joined: supplier.createdAt
      };
    }).sort((a, b) => b.balance - a.balance);
  },

  addSupplier: async (storeId, name, phone) => {
    const newSupplier = {
      id: 'supp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      storeId,
      name: name.trim(),
      phone: phone.trim(),
      createdAt: new Date().toISOString()
    };
    await db.suppliers.add(newSupplier);
    return newSupplier.id;
  },

  // 3. RECORD PURCHASE OR PAYMENT
  addTransaction: async (storeId, supplierId, amount, paid, items, note) => {
    const supplier = await db.suppliers.get(supplierId);
    if (!supplier) throw new Error("Supplier not found");

    const allTxs = await db.supplierTransactions.where('supplierId').equals(supplierId).toArray();
    const prevPurchases = allTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const prevPayments = allTxs.reduce((sum, t) => sum + (parseFloat(t.paid) || 0), 0);
    const prevBalance = prevPurchases - prevPayments;

    let itemsData = items;
    if (Array.isArray(items)) {
      itemsData = JSON.stringify(items);
    }

    const newTx = {
      id: 'stx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      storeId,
      supplierId,
      amount: parseFloat(amount) || 0,
      paid: parseFloat(paid) || 0,
      items: itemsData,
      note: note || '',
      prevBalance,
      newBalance: prevBalance + (parseFloat(amount) || 0) - (parseFloat(paid) || 0),
      date: new Date().toISOString(),
      isVoid: false
    };

    await db.supplierTransactions.add(newTx);
    
    // 👇 UPDATED: Return both the transaction ID and updated supplier
    const updatedSuppliers = await SupplierService.getAll(storeId);
    return { 
      transactionId: newTx.id, 
      supplier: updatedSuppliers.find(s => s.id === supplierId) 
    };
  },

  clearDebt: async (storeId, supplierId) => {
    const supplier = await db.suppliers.get(supplierId);
    if (!supplier) return;

    const allTxs = await db.supplierTransactions.where('supplierId').equals(supplierId).toArray();
    const totalPurchases = allTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const totalPayments = allTxs.reduce((sum, t) => sum + (parseFloat(t.paid) || 0), 0);
    const currentBalance = totalPurchases - totalPayments;

    if (currentBalance <= 0) return;

    const newTx = {
      id: 'stx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      storeId,
      supplierId,
      amount: 0,
      paid: currentBalance,
      items: 'Balance cleared',
      prevBalance: currentBalance,
      newBalance: 0,
      date: new Date().toISOString(),
      isVoid: false
    };

    await db.supplierTransactions.add(newTx);
  },

  voidTransaction: async (storeId, supplierId, txId, reason) => {
    await db.supplierTransactions.update(txId, { 
      isVoid: true, 
      voidReason: reason,
      voidedAt: new Date().toISOString()
    });
  },

  redoTransaction: async (storeId, supplierId, txId) => {
    await db.supplierTransactions.update(txId, { 
      isVoid: false, 
      voidReason: null,
      voidedAt: null
    });
  }
};