import { db } from '../database/db';

const generateId = () => crypto.randomUUID();

export const AuthService = {
  // Simulated Google Login (Replace with Firebase/Supabase in production)
  loginWithGoogle: async () => {
    // Simulate network delay for realistic UX
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    
    // In production, this data comes from: const result = await signInWithPopup(auth, googleProvider);
    const mockGoogleUser = {
      email: "owner@gmail.com", 
      name: "Business Owner",
      picture: "https://ui-avatars.com/api/?name=Business+Owner&background=006B3F&color=fff"
    };

    // Check if this Google email already has a store in our DB
    const existingStore = await db.stores.where('email').equals(mockGoogleUser.email).first();
    
    if (existingStore) {
      const session = { storeId: existingStore.id, email: existingStore.email, ownerName: existingStore.ownerName };
      localStorage.setItem('cb_saas_session', JSON.stringify(session));
      return { user: mockGoogleUser, store: existingStore, isNew: false };
    }

    // New user: return flag to trigger onboarding
    return { user: mockGoogleUser, store: null, isNew: true };
  },

  // Called after the user fills out the business setup form
  completeBusinessSetup: async (email, businessName, businessPhone) => {
    const storeId = generateId();
    const newStore = {
      id: storeId,
      name: businessName,
      ownerName: "Business Owner", // In production, extract from Google profile
      email: email,
      phone: businessPhone,
      password: "google-auth", // Placeholder for OAuth users
      createdAt: new Date().toISOString()
    };
    
    await db.stores.add(newStore);
    
    const session = { storeId: newStore.id, email: newStore.email, ownerName: newStore.ownerName };
    localStorage.setItem('cb_saas_session', JSON.stringify(session));
    
    return newStore;
  },

  logout: () => {
    localStorage.removeItem('cb_saas_session');
    localStorage.removeItem('cb_pending_google_email');
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