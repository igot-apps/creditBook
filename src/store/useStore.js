import { create } from 'zustand';
import { db } from '../database/db';
import { CustomerService } from '../services/CustomerService';

const useStore = create((set, get) => ({
  view: 'home',
  theme: localStorage.getItem('cb_theme') || 'light',
  toast: null,
  showConfetti: false,
  currentStore: null,
  customers: [],
  selectedCustomer: null,
  prefillTransaction: null,
  drafts: [], // 👈 NEW: Array to hold draft invoices
  isMenuOpen: false,

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

  // 👇 NEW: Draft Actions
  fetchDrafts: async () => {
    const { currentStore } = get();
    if (!currentStore) return;
    const loaded = await db.drafts.where('storeId').equals(currentStore.id).reverse().sortBy('createdAt');
    set({ drafts: loaded });
  },
  
  saveDraft: async (draftData) => {
    const { currentStore } = get();
    if (!currentStore) return;
    
    const dataToSave = {
      ...draftData,
      storeId: currentStore.id,
      createdAt: new Date().toISOString()
    };
    
    // 👇 FIX: IndexedDB throws a DataError if you pass `id: null` 
    // when the key path is auto-incrementing (`++id`). We must delete it.
    if (!dataToSave.id) {
      delete dataToSave.id;
    }

    // If it has a valid ID, update it. Otherwise, add it as a new draft.
    if (dataToSave.id) {
      await db.drafts.update(dataToSave.id, dataToSave);
    } else {
      await db.drafts.add(dataToSave);
    }
    
    await get().fetchDrafts();
  },

  deleteDraft: async (id) => {
    await db.drafts.delete(id);
    await get().fetchDrafts();
  },

  refreshCustomers: async () => {
    const { currentStore } = get();
    if (!currentStore) return [];
    const loaded = await CustomerService.getAllWithHistory(currentStore.id);
    set({ customers: loaded });
    return loaded;
  },

  initializeApp: async () => {
    try {
      let store = await db.stores.toCollection().first();
      if (!store) {
        const mobileSafeId = 'store_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const defaultStore = { id: mobileSafeId, name: 'My Business', ownerName: 'Owner', email: '', phone: '', createdAt: new Date().toISOString() };
        await db.stores.add(defaultStore);
        store = defaultStore;
      }
      set({ currentStore: store });
      const customers = await CustomerService.getAllWithHistory(store.id);
      set({ customers });
      await get().fetchDrafts(); // 👈 Load drafts on startup
      set({ view: 'home' });
    } catch (error) {
      console.error("DB init failed:", error);
      set({ view: 'home', currentStore: { name: 'My Business', ownerName: 'Owner' }, customers: [] });
    }
  }
}));

export default useStore;