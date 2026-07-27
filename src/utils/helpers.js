export const formatCurrency = (n) => `GHS ${Number(n || 0).toFixed(2)}`;
export const formatDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
export const formatShortDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
export const uid = () => Math.random().toString(36).slice(2, 9);