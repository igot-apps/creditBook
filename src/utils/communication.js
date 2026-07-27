export const openSMS = (phone, message) => {
  window.location.href = `sms:${phone.replace(/\s+/g, "")}?body=${encodeURIComponent(message)}`;
};

export const openWhatsApp = (phone, message) => {
  const cleanPhone = phone.replace(/\s+/g, "").replace(/^0/, "233");
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
};

export const openDialer = (phone) => {
  window.location.href = `tel:${phone.replace(/\s+/g, "")}`;
};