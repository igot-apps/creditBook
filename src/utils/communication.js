// 1. Open Default SMS App
export const openSMS = (phone, message) => {
  if (!phone) {
    alert("Please add a phone number to send an SMS.");
    return;
  }
  const encodedMessage = encodeURIComponent(message);
  window.location.href = `sms:${phone}?body=${encodedMessage}`;
};

// 2. Open WhatsApp App/Web
export const openWhatsApp = (phone, message) => {
  if (!phone) {
    alert("Please add a phone number to send via WhatsApp.");
    return;
  }

  // Step A: Remove ALL non-digit characters (spaces, dashes, plus signs, etc.)
  let cleanPhone = phone.replace(/\D/g, '');

  // Step B: Fix local numbers (e.g., if user typed "0241234567")
  // WhatsApp requires the international format WITHOUT the leading zero.
  // NOTE: '233' is the country code for Ghana. Change this if you are in a different country!
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '233' + cleanPhone.substring(1); 
  }

  // Step C: Create the official WhatsApp link
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  
  // Step D: Open in a new tab so the user doesn't lose their place in your app
  window.open(url, '_blank');
};

// 3. Open Phone Dialer
export const openDialer = (phone) => {
  if (!phone) return;
  window.location.href = `tel:${phone}`;
};