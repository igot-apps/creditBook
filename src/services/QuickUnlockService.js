const PREFIX = 'creditbook_quick_unlock_';
const encoder = new TextEncoder();

const bytesToBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (value) => Uint8Array.from(atob(value), char => char.charCodeAt(0));

const deriveHash = async (pin, salt) => {
  const material = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 150000 }, material, 256);
  return bytesToBase64(new Uint8Array(bits));
};

const keyFor = (userId) => `${PREFIX}${userId}`;

const read = (userId) => {
  try { return JSON.parse(localStorage.getItem(keyFor(userId))) || null; }
  catch { return null; }
};

const write = (userId, value) => localStorage.setItem(keyFor(userId), JSON.stringify(value));

export const QuickUnlockService = {
  hasPin: (userId) => Boolean(userId && read(userId)?.hash),

  createPin: async (userId, pin) => {
    if (!/^\d{4,6}$/.test(pin)) throw new Error('Use a 4–6 digit PIN. Six digits is recommended.');
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await deriveHash(pin, salt);
    write(userId, { salt: bytesToBase64(salt), hash, pinLength: pin.length, attempts: 0, lockedUntil: 0, createdAt: new Date().toISOString() });
    sessionStorage.setItem(`${PREFIX}verified_${userId}`, '1');
  },

  verifyPin: async (userId, pin) => {
    const record = read(userId);
    if (!record?.hash) return { ok: false, missing: true };
    if (Number(record.lockedUntil) > Date.now()) {
      return { ok: false, lockedUntil: Number(record.lockedUntil) };
    }
    const hash = await deriveHash(pin, base64ToBytes(record.salt));
    if (hash === record.hash) {
      write(userId, { ...record, attempts: 0, lockedUntil: 0 });
      sessionStorage.setItem(`${PREFIX}verified_${userId}`, '1');
      return { ok: true };
    }
    const attempts = Number(record.attempts || 0) + 1;
    const lockedUntil = attempts >= 5 ? Date.now() + 5 * 60 * 1000 : 0;
    write(userId, { ...record, attempts: lockedUntil ? 0 : attempts, lockedUntil });
    return { ok: false, attemptsRemaining: lockedUntil ? 0 : 5 - attempts, lockedUntil };
  },

  isVerifiedThisSession: (userId) => sessionStorage.getItem(`${PREFIX}verified_${userId}`) === '1',
  markVerified: (userId) => sessionStorage.setItem(`${PREFIX}verified_${userId}`, '1'),
  getPinLength: (userId) => Number(read(userId)?.pinLength || 4),
  clearSessionVerification: (userId) => sessionStorage.removeItem(`${PREFIX}verified_${userId}`),
  clearPin: (userId) => {
    localStorage.removeItem(keyFor(userId));
    sessionStorage.removeItem(`${PREFIX}verified_${userId}`);
  },
};
