import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { db } from '../database/db';

const generateId = () => crypto.randomUUID();
const provider = new GoogleAuthProvider();

export const AuthService = {
  // 1. REAL Google Login (Optional)
  loginWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const existingStore = await db.stores.where('email').equals(user.email).first();
      
      if (existingStore) {
        const session = { storeId: existingStore.id, email: existingStore.email, ownerName: existingStore.ownerName, uid: user.uid };
        localStorage.setItem('cb_saas_session', JSON.stringify(session));
        return { user, store: existingStore, isNew: false };
      }

      return { user, store: null, isNew: true };
    } catch (error) {
      console.error("Google Login Error:", error);
      throw error;
    }
  },

  // 2. NEW: Guest Login (100% Local, No Firebase Required)
  loginAsGuest: async () => {
    // Check if a guest store already exists to prevent duplicates
    const existingGuest = await db.stores.where('email').equals('guest@creditbook.local').first();
    
    let store;
    if (existingGuest) {
      store = existingGuest;
    } else {
      // Create a default local store for the guest
      const storeId = generateId();
      store = {
        id: storeId,
        name: "Guest Store",
        ownerName: "Guest User",
        email: "guest@creditbook.local",
        phone: "0000000000",
        authProvider: "guest",
        createdAt: new Date().toISOString()
      };
      await db.stores.add(store);
    }

    const session = { storeId: store.id, email: store.email, ownerName: store.ownerName };
    localStorage.setItem('cb_saas_session', JSON.stringify(session));
    
    return { store, isNew: !existingGuest };
  },

  completeBusinessSetup: async (email, businessName, businessPhone, userName) => {
    const storeId = generateId();
    const newStore = { 
      id: storeId, 
      name: businessName, 
      ownerName: userName || "Business Owner", 
      email, 
      phone: businessPhone, 
      authProvider: "google", 
      createdAt: new Date().toISOString() 
    };
    await db.stores.add(newStore);
    const session = { storeId: newStore.id, email: newStore.email, ownerName: newStore.ownerName };
    localStorage.setItem('cb_saas_session', JSON.stringify(session));
    return newStore;
  },

  logout: async () => {
    try { await signOut(auth); } catch (e) { /* Ignore Firebase errors if guest */ }
    localStorage.removeItem('cb_saas_session');
    localStorage.removeItem('cb_pending_google_email');
    localStorage.removeItem('cb_pending_google_name');
  },

  getSession: () => {
    const session = localStorage.getItem('cb_saas_session');
    return session ? JSON.parse(session) : null;
  },

  getCurrentStore: async () => {
    const session = AuthService.getSession();
    if (!session) return null;
    return await db.stores.get(session.storeId);
  },

  checkCloudBackup: async (uid) => {
    // Guest users don't have a UID, so no cloud backup check needed
    if (!uid) return false;
    // (Cloud sync logic will go here later)
    return false; 
  }
};