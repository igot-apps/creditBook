export const formatCurrency = (n) => `GHS ${Number(n || 0).toFixed(2)}`;
export const formatDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
export const formatShortDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
export const uid = () => Math.random().toString(36).slice(2, 9);

// 👇 ADD THIS to src/utils/helpers.js
export const isValidPhone = (phone) => {
  if (!phone) return false;
  // Remove any spaces or dashes just in case
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Must be purely numeric and between 7 and 15 digits long
  return /^\d{7,15}$/.test(cleaned);
};