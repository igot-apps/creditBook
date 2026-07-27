import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { db } from '../database/db';

const generateId = () => crypto.randomUUID();
const provider = new GoogleAuthProvider();

export const AuthService = {
  // REAL Google Login
  loginWithGoogle: async () => {
    try {
      // This triggers the real Google popup
      const result = await signInWithPopup(auth, provider);
      const user = result.user; // Contains: email, displayName, photoURL, uid

      // Check if this Google email already has a store in our IndexedDB
      const existingStore = await db.stores.where('email').equals(user.email).first();
      
      if (existingStore) {
        const session = { 
          storeId: existingStore.id, 
          email: existingStore.email, 
          ownerName: existingStore.ownerName,
          uid: user.uid 
        };
        localStorage.setItem('cb_saas_session', JSON.stringify(session));
        return { user, store: existingStore, isNew: false };
      }

      // New user: return flag to trigger onboarding
      return { user, store: null, isNew: true };
      
    } catch (error) {
      console.error("Google Login Error:", error);
      throw error;
    }
  },

  // Called after the user fills out the business setup form
  completeBusinessSetup: async (email, businessName, businessPhone, userName) => {
    const storeId = generateId();
    const newStore = {
      id: storeId,
      name: businessName,
      ownerName: userName || "Business Owner",
      email: email,
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
    await signOut(auth); // Signs out of Firebase
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
  }
};