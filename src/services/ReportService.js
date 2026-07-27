import { CustomerRepository } from '../repositories/CustomerRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const ReportService = {
  getAllTransactionsWithCustomers: async () => {
    const customers = await CustomerRepository.getAll();
    const allTx = await Promise.all(
      customers.flatMap(async (c) => {
        const txs = await TransactionRepository.getByCustomerId(c.id);
        return txs.map(t => ({ ...t, customerName: c.name, customerPhone: c.phone }));
      })
    );
    return allTx.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  getDailySales: async (date = new Date()) => {
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const txs = await ReportService.getAllTransactionsWithCustomers();
    const dayTxs = txs.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= dayStart && txDate < dayEnd;
    });
    
    return {
      totalSales: dayTxs.reduce((sum, t) => sum + (t.amount || 0), 0),
      totalCollected: dayTxs.reduce((sum, t) => sum + (t.paid || 0), 0),
      transactionCount: dayTxs.length,
      transactions: dayTxs
    };
  },

  getSalesTrend: async (days = 7) => {
    const txs = await ReportService.getAllTransactionsWithCustomers();
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

  getTopCustomers: async (limit = 5) => {
    const customers = await CustomerRepository.getAll();
    
    const enriched = await Promise.all(customers.map(async (c) => {
      const txs = await TransactionRepository.getByCustomerId(c.id);
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

  getMostOverdue: async (limit = 5) => {
    const customers = await CustomerRepository.getAll();
    
    const enriched = await Promise.all(customers.map(async (c) => {
      const txs = await TransactionRepository.getByCustomerId(c.id);
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