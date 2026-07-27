import { db } from '../database/db';

const generateId = () => crypto.randomUUID();

export const AuthService = {
  register: async (storeName, ownerName, email, phone, password) => {
    const storeId = generateId();
    const newStore = {
      id: storeId,
      name: storeName,
      ownerName,
      email,
      phone,
      password, // Hash this in production!
      createdAt: new Date().toISOString()
    };
    await db.stores.add(newStore);
    return newStore;
  },

  login: async (email, password) => {
    const store = await db.stores.where('email').equals(email).first();
    if (store && store.password === password) {
      const session = { storeId: store.id, email: store.email, ownerName: store.ownerName };
      localStorage.setItem('cb_saas_session', JSON.stringify(session));
      return store;
    }
    throw new Error('Invalid email or password');
  },

  logout: () => {
    localStorage.removeItem('cb_saas_session');
  },

  getSession: () => {
    const session = localStorage.getItem('cb_saas_session');
    return session ? JSON.parse(session) : null;
  },

  getCurrentStore: async () => {
    const session = AuthService.getSession();
    if (!session) return null;
    return await db.stores.get(session.storeId);
  }
};