import { CustomerRepository } from '../repositories/CustomerRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const ReportService = {
  getAllTransactionsWithCustomers: async (storeId) => {
    console.log("🔵 ReportService: Fetching customers for storeId:", storeId);
    const customers = await CustomerRepository.getAll(storeId);
    console.log("🟢 ReportService: Found", customers.length, "customers");
    
    const allTx = await Promise.all(
      customers.flatMap(async (c) => {
        const txs = await TransactionRepository.getByCustomerId(storeId, c.id);
        return txs.map(t => ({ ...t, customerName: c.name, customerPhone: c.phone }));
      })
    );
    const flatTx = allTx.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log("🟢 ReportService: Found", flatTx.length, "total transactions");
    return flatTx;
  },

  getDailySales: async (storeId, date = new Date()) => {
    console.log("🔵 ReportService: Getting daily sales for storeId:", storeId);
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const txs = await ReportService.getAllTransactionsWithCustomers(storeId);
    const dayTxs = txs.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= dayStart && txDate < dayEnd;
    });
    
    console.log("🟢 ReportService: Today's transactions:", dayTxs.length);
    
    return {
      totalSales: dayTxs.reduce((sum, t) => sum + (t.amount || 0), 0),
      totalCollected: dayTxs.reduce((sum, t) => sum + (t.paid || 0), 0),
      transactionCount: dayTxs.length,
      transactions: dayTxs
    };
  },

  getSalesTrend: async (storeId, days = 7) => {
    console.log("🔵 ReportService: Getting sales trend for storeId:", storeId);
    const txs = await ReportService.getAllTransactionsWithCustomers(storeId);
    const trend = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const dayTxs = txs.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= dayStart && txDate < dayEnd;
      });
      
      trend.push({
        date: dayStart,
        label: day.toLocaleDateString('en-GB', { weekday: 'short' }),
        sales: dayTxs.reduce((sum, t) => sum + (t.amount || 0), 0),
        collected: dayTxs.reduce((sum, t) => sum + (t.paid || 0), 0)
      });
    }
    
    return trend;
  },

  getTopCustomers: async (storeId, limit = 5) => {
    console.log("🔵 ReportService: Getting top customers for storeId:", storeId);
    const customers = await CustomerRepository.getAll(storeId);
    
    const enriched = await Promise.all(customers.map(async (c) => {
      const txs = await TransactionRepository.getByCustomerId(storeId, c.id);
      const totalPurchases = txs.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalPaid = txs.reduce((sum, t) => sum + (t.paid || 0), 0);
      return {
        ...c,
        totalPurchases,
        totalPaid,
        balance: totalPurchases - totalPaid,
        txCount: txs.length
      };
    }));
    
    return enriched
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, limit);
  },

  getMostOverdue: async (storeId, limit = 5) => {
    console.log("🔵 ReportService: Getting most overdue for storeId:", storeId);
    const customers = await CustomerRepository.getAll(storeId);
    
    const enriched = await Promise.all(customers.map(async (c) => {
      const txs = await TransactionRepository.getByCustomerId(storeId, c.id);
      const balance = txs.reduce((sum, t) => sum + (t.amount || 0) - (t.paid || 0), 0);
      const lastTx = txs.length > 0 ? txs[txs.length - 1] : null;
      const daysSinceContact = lastTx 
        ? Math.floor((new Date() - new Date(lastTx.date)) / 86400000)
        : 999;
      return { ...c, balance, daysSinceContact };
    }));
    
    return enriched
      .filter(c => c.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit);
  }
};