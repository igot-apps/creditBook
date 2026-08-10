import { db } from '../database/db';
import { ContactService } from './ContactService';

export const TransactionService = {
  // 1. GET ALL TRANSACTIONS
  getAll: async (storeId, filters = {}) => {
    let query = db.transactions.where('storeId').equals(storeId);
    if (filters.contactId) {
      query = query.where('contactId').equals(filters.contactId);
    }
    if (filters.type) {
      query = query.where('type').equals(filters.type);
    }
    const transactions = await query.toArray();
    // Sort by date descending (newest first)
    return transactions.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  },

  // 2. GET SINGLE TRANSACTION
  getById: async (txId) => {
    return await db.transactions.get(txId);
  },

  // 3. UPDATE TRANSACTION
  update: async (txId, updates) => {
    return await db.transactions.update(txId, updates);
  },

  // 4. CREATE TRANSACTION (The Immutable Fact)
  create: async (storeId, contactId, type, items, amount, paid, note, extraData = {}) => {
    const newTx = {
      id: 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      storeId,
      contactId,
      type, // 'sale' or 'purchase' or 'payment' or 'supplier_payment'
      items: items || [],
      amount: parseFloat(amount) || 0,
      paid: parseFloat(paid) || 0,
      note: note || '',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      contactName: extraData.contactName || null,
      contactPhone: extraData.contactPhone || null,
      fixReason: extraData.fixReason || null,
      status: extraData.status || 'active',
      cancelReason: extraData.cancelReason || null,
      replacedByTransactionId: extraData.replacedByTransactionId || null,
      correctsTransactionId: extraData.correctsTransactionId || null
    };
    await db.transactions.add(newTx);
    // Automatically recalculate and update the contact's balance
    await ContactService.updateBalance(contactId);
    return newTx.id;
  },

  // 5. CANCEL TRANSACTION
  cancelTransaction: async (txId, reason) => {
    const tx = await db.transactions.get(txId);
    if (!tx) throw new Error("Transaction not found");
    await db.transactions.update(txId, {
      status: 'cancelled',
      cancelReason: reason || 'No reason provided',
      cancelledAt: new Date().toISOString()
    });
    // Recalculate balance to remove the impact of this transaction
    await ContactService.updateBalance(tx.contactId);
  },

  // 6. REDO (RESTORE) TRANSACTION
  redoTransaction: async (txId) => {
    const tx = await db.transactions.get(txId);
    if (!tx) throw new Error("Transaction not found");
    await db.transactions.update(txId, {
      status: 'active',
      cancelReason: null,
      cancelledAt: null
    });
    // Recalculate balance to re-apply the impact
    await ContactService.updateBalance(tx.contactId);
  },

  // 7. GET HISTORY FOR A CONTACT
  getHistory: async (contactId) => {
    const transactions = await db.transactions.where('contactId').equals(contactId).toArray();
    // Sort newest first for the timeline
    return transactions.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  },

  // 8. CALCULATE BALANCE (Ignores cancelled transactions)
  calculateBalance: async (contactId) => {
    const transactions = await db.transactions.where('contactId').equals(contactId).toArray();
    let totalAmount = 0;
    let totalPaid = 0;
    transactions.forEach(tx => {
      if (tx.status !== 'cancelled') {
        totalAmount += parseFloat(tx.amount) || 0;
        totalPaid += parseFloat(tx.paid) || 0;
      }
    });
    return totalAmount - totalPaid;
  },

  // ==========================================
  // CUSTOMER PAYMENT & FIFO LOGIC
  // ==========================================
  recordPayment: async (storeId, customerId, amount, note, extraData = {}) => {
    const paymentAmount = parseFloat(amount) || 0;
    if (paymentAmount <= 0) throw new Error("Invalid payment amount");

    // 1. Fetch all transactions for this customer
    const allTx = await db.transactions.where({ storeId, contactId: customerId }).toArray();

    // 2. Filter active sales and payments
    const activeSales = allTx.filter(tx => tx.type === 'sale' && tx.status === 'active');
    const activePayments = allTx.filter(tx => tx.type === 'payment' && tx.status === 'active');

    // 3. Calculate current outstanding for each sale
    const salesWithOutstanding = activeSales.map(sale => {
      const allocated = activePayments
        .filter(p => p.allocations)
        .reduce((sum, p) => sum + (p.allocations.find(a => a.transactionId === sale.id)?.amount || 0), 0);
      const outstanding = (parseFloat(sale.amount) || 0) - (parseFloat(sale.paid) || 0) - allocated;
      return { ...sale, outstanding: Math.max(0, outstanding) };
    });

    // 4. Sort Oldest First (FIFO)
    salesWithOutstanding.sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));

    // 5. FIFO Allocation Algorithm
    const allocations = [];
    let remainingToAllocate = paymentAmount;

    for (const sale of salesWithOutstanding) {
      if (remainingToAllocate <= 0) break;
      if (sale.outstanding > 0) {
        const allocateAmount = Math.min(remainingToAllocate, sale.outstanding);
        allocations.push({ transactionId: sale.id, amount: allocateAmount });
        remainingToAllocate -= allocateAmount;
      }
    }

    // 6. Save the Payment Transaction
    const generateId = () => 'pay_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    const paymentId = generateId();
    
    const paymentTx = {
      id: paymentId,
      storeId,
      contactId: customerId,
      type: 'payment',
      amount: 0,
      paid: paymentAmount,
      items: [],
      note,
      allocations,
      status: 'active',
      createdAt: new Date().toISOString(),
      ...extraData
    };

    await db.transactions.add(paymentTx);
    return paymentId;
  },

  // Helper to get the true outstanding balance of a specific sale (for the UI)
  getOutstandingAmount: async (saleId) => {
    const sale = await db.transactions.get(saleId);
    if (!sale) return 0;
    const payments = await db.transactions
      .where({ contactId: sale.contactId })
      .filter(p => p.type === 'payment' && p.status === 'active' && p.allocations)
      .toArray();
    const allocated = payments.reduce((sum, p) => sum + (p.allocations.find(a => a.transactionId === saleId)?.amount || 0), 0);
    return Math.max(0, (parseFloat(sale.amount) || 0) - (parseFloat(sale.paid) || 0) - allocated);
  },

  // ==========================================
  // SUPPLIER PAYMENT & FIFO LOGIC
  // ==========================================
  recordSupplierPayment: async (storeId, supplierId, amount, note, extraData = {}) => {
    const paymentAmount = parseFloat(amount) || 0;
    if (paymentAmount <= 0) throw new Error("Invalid payment amount");

    // 1. Fetch all transactions for this supplier
    const allTx = await db.transactions.where({ storeId, contactId: supplierId }).toArray();

    // 2. Filter active purchases and supplier payments
    const activePurchases = allTx.filter(tx => tx.type === 'purchase' && tx.status === 'active');
    const activePayments = allTx.filter(tx => tx.type === 'supplier_payment' && tx.status === 'active');

    // 3. Calculate current outstanding for each purchase
    const purchasesWithOutstanding = activePurchases.map(purchase => {
      const allocated = activePayments
        .filter(p => p.allocations)
        .reduce((sum, p) => sum + (p.allocations.find(a => a.transactionId === purchase.id)?.amount || 0), 0);
      const outstanding = (parseFloat(purchase.amount) || 0) - (parseFloat(purchase.paid) || 0) - allocated;
      return { ...purchase, outstanding: Math.max(0, outstanding) };
    });

    // 4. Sort Oldest First (FIFO)
    purchasesWithOutstanding.sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));

    // 5. FIFO Allocation Algorithm
    const allocations = [];
    let remainingToAllocate = paymentAmount;

    for (const purchase of purchasesWithOutstanding) {
      if (remainingToAllocate <= 0) break;
      if (purchase.outstanding > 0) {
        const allocateAmount = Math.min(remainingToAllocate, purchase.outstanding);
        allocations.push({ transactionId: purchase.id, amount: allocateAmount });
        remainingToAllocate -= allocateAmount;
      }
    }

    // 6. Save the Payment Transaction
    const generateId = () => 'spay_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
    const paymentId = generateId();
    
    const paymentTx = {
      id: paymentId,
      storeId,
      contactId: supplierId,
      type: 'supplier_payment',
      amount: 0,
      paid: paymentAmount,
      items: [],
      note,
      allocations,
      status: 'active',
      createdAt: new Date().toISOString(),
      ...extraData
    };

    await db.transactions.add(paymentTx);
    return paymentId;
  },

  // Helper to get the true outstanding balance of a specific purchase (for the UI)
  getSupplierOutstandingAmount: async (purchaseId) => {
    const purchase = await db.transactions.get(purchaseId);
    if (!purchase) return 0;
    const payments = await db.transactions
      .where({ contactId: purchase.contactId })
      .filter(p => p.type === 'supplier_payment' && p.status === 'active' && p.allocations)
      .toArray();
    const allocated = payments.reduce((sum, p) => sum + (p.allocations.find(a => a.transactionId === purchaseId)?.amount || 0), 0);
    return Math.max(0, (parseFloat(purchase.amount) || 0) - (parseFloat(purchase.paid) || 0) - allocated);
  }
};