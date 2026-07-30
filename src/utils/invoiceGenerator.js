import { db } from '../database/db';

export const generateInvoiceNumber = async (storeId) => {
  const now = new Date();
  const year = now.getFullYear();
  
  // Get or create counter for this store and year
  const counter = await db.invoiceCounters.where({ storeId, year }).first();
  
  let nextNumber = 1;
  if (counter) {
    nextNumber = counter.counter + 1;
    await db.invoiceCounters.update(counter.id, { counter: nextNumber });
  } else {
    await db.invoiceCounters.add({ storeId, year, counter: 1 });
  }
  
  // Format: INV-2024-001
  const formattedNumber = `INV-${year}-${String(nextNumber).padStart(3, '0')}`;
  return formattedNumber;
};