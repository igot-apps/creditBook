import { parsePhoneNumber } from 'libphonenumber-js';

// 1. Format Currency (GHS)
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2
  }).format(amount || 0);
};

// 2. Format Date
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// 3. Professional Phone Validation (Ghana Default)
export const isValidPhone = (phone) => {
  if (!phone || phone.length < 5) return false;
  
  try {
    // Default to Ghana ('GH') for local market accuracy. 
    // It will still accept international numbers if they start with '+'
    const phoneNumber = parsePhoneNumber(phone, 'GH');
    return phoneNumber ? phoneNumber.isValid() : false;
  } catch (e) {
    return false;
  }
};