import { parsePhoneNumber } from 'libphonenumber-js';

// 1. Format Currency (Dynamic)
export const formatCurrency = (amount, currency = "GH₵") => {
  const num = parseFloat(amount) || 0;
  
  // Format the number with standard comma separation and 2 decimal places
  const formattedNum = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
  
  // Prepend the custom currency symbol
  return `${currency}${formattedNum}`;
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