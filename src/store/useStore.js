import { create } from 'zustand';
import { db } from '../database/db';
import { CustomerService } from '../services/CustomerService';

const useStore = create((set, get) => ({
  // State
  view: 'home',
  theme: localStorage.getItem('cb_theme') || 'light',
  toast: null,
  showConfetti: false,
  currentStore: null,
  customers: [],
  selectedCustomer: null,
  prefillTransaction: null, // Used for the "Void & Duplicate" redo flow
  isMenuOpen: false,

  // Actions
  setView: (view) => set({ view }),
  setTheme: (theme) => {
    localStorage.setItem('cb_theme', theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    set({ theme });
  },
  showToast: (msg) => {
    set({ toast: msg });
    setTimeout(() => set({ toast: null }), 2500);
  },
  triggerConfetti: () => {
    set({ showConfetti: true });
    setTimeout(() => set({ showConfetti: false }), 3000);
  },
  setCurrentStore: (store) => set({ currentStore: store }),
  setCustomers: (customers) => set({ customers }),
  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
  setPrefillTransaction: (tx) => set({ prefillTransaction: tx }),
  setIsMenuOpen: (isOpen) => set({ isMenuOpen: isOpen }),

  refreshCustomers: async () => {
    const { currentStore } = get();
    if (!currentStore) return [];
    const loaded = await CustomerService.getAllWithHistory(currentStore.id);
    set({ customers: loaded });
    return loaded;
  },

  initializeApp: async () => {
    try {
      console.log("🔄 Initializing local database...");
      let store = await db.stores.toCollection().first();
      
      if (!store) {
        console.log("📦 No store found. Creating default local store...");
        const mobileSafeId = 'store_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        
        const defaultStore = {
          id: mobileSafeId, 
          name: 'My Business',
          ownerName: 'Owner',
          email: '',
          phone: '',
          createdAt: new Date().toISOString()
        };
        await db.stores.add(defaultStore);
        store = defaultStore;
      }
      
      console.log("✅ Store loaded:", store.name);
      set({ currentStore: store });
      
      const customers = await CustomerService.getAllWithHistory(store.id);
      console.log("✅ Customers loaded:", customers.length);
      
      set({ customers });
      set({ view: 'home' });
    } catch (error) {
      console.error("❌ Database initialization failed:", error);
      set({ 
        view: 'home', 
        currentStore: { name: 'My Business', ownerName: 'Owner' }, 
        customers: [] 
      });
    }
  }
}));

export default useStore;