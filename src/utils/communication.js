// 1. Open Default SMS App
export const openSMS = (phone, message) => {
  if (!phone) {
    alert("Please add a phone number to send an SMS.");
    return;
  }
  const encodedMessage = encodeURIComponent(message);
  window.location.href = `sms:${phone}?body=${encodedMessage}`;
};

// 2. Open WhatsApp App Instantly (Native Deep Link)
export const openWhatsApp = (phone, message) => {
  if (!phone) {
    alert("Please add a phone number to send via WhatsApp.");
    return;
  }

  // Clean the phone number
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Remove leading zero and add country code (Example: 233 for Ghana)
  // Change '233' to your local country code if needed!
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '233' + cleanPhone.substring(1); 
  }

  const encodedMessage = encodeURIComponent(message);
  
  // 👇 THIS IS THE MAGIC: Forces the native app to open instantly
  const url = `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
  
  // Use location.href to trigger the app switch immediately
  window.location.href = url;
};

// 3. Open Phone Dialer
export const openDialer = (phone) => {
  if (!phone) return;
  window.location.href = `tel:${phone}`;
};