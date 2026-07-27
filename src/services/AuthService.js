import { db } from '../database/db';

const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback for older browsers
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
};

export const AuthService = {
  // Test if database is working
  testDatabase: async () => {
    try {
      console.log("🔵 Testing database connection...");
      await db.open();
      console.log("🟢 Database opened successfully");
      return { success: true, message: "Database is working" };
    } catch (error) {
      console.error("🔴 Database test failed:", error);
      return { success: false, message: error.message };
    }
  },

  register: async (storeName, ownerName, email, phone, password) => {
    console.log("🔵 AuthService.register() called with:", { storeName, email });
    
    // Test database first
    const dbTest = await AuthService.testDatabase();
    if (!dbTest.success) {
      throw new Error("Database not available: " + dbTest.message);
    }

    try {
      const storeId = generateId();
      const newStore = {
        id: storeId,
        name: storeName,
        ownerName,
        email,
        phone,
        password,
        createdAt: new Date().toISOString()
      };

      console.log("🔵 Adding store to database...");
      await db.stores.add(newStore);
      console.log("🟢 Store added successfully with ID:", storeId);
      
      return newStore;
    } catch (error) {
      console.error("🔴 Registration failed:", error);
      if (error.name === 'ConstraintError') {
        throw new Error("Email already exists");
      }
      throw new Error("Registration failed: " + error.message);
    }
  },

  login: async (email, password) => {
    console.log("🔵 AuthService.login() called for:", email);
    
    const dbTest = await AuthService.testDatabase();
    if (!dbTest.success) {
      throw new Error("Database not available: " + dbTest.message);
    }

    try {
      console.log("🔵 Querying database for user...");
      const store = await db.stores.where('email').equals(email).first();
      
      if (!store) {
        console.log("🟡 No user found with email:", email);
        throw new Error("Invalid email or password");
      }

      if (store.password !== password) {
        console.log("🟡 Password mismatch for:", email);
        throw new Error("Invalid email or password");
      }

      const session = { storeId: store.id, email: store.email, ownerName: store.ownerName };
      localStorage.setItem('cb_saas_session', JSON.stringify(session));
      console.log("🟢 Login successful for:", store.name);
      
      return store;
    } catch (error) {
      console.error("🔴 Login failed:", error);
      throw error;
    }
  },

  logout: () => {
    console.log("🔵 Logging out...");
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