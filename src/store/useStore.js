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
  drafts: [],
  autoDraft: null,
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

  fetchDrafts: async () => {
    const { currentStore } = get();
    if (!currentStore) return;
    
    // 1. Fetch manual drafts
    const loaded = await db.drafts.where('storeId').equals(currentStore.id).filter(d => !d.isAuto).reverse().sortBy('createdAt');
    
    //  FIX: Use .filter() instead of .where({}) to avoid Dexie index errors
    const auto = await db.drafts.where('storeId').equals(currentStore.id).filter(d => d.isAuto === true).first();
    
    console.log("🟢 fetchDrafts: Found autoDraft?", auto ? "YES" : "NO");
    set({ drafts: loaded, autoDraft: auto || null });
  },
  
  saveDraft: async (draftData, isAuto = false) => {
    console.log("🔵 saveDraft called. isAuto:", isAuto);
    const { currentStore } = get();
    if (!currentStore) {
      console.log("🔴 saveDraft ABORTED: currentStore is missing!");
      return;
    }
    
    const dataToSave = {
      ...draftData,
      storeId: currentStore.id,
      isAuto: isAuto,
      updatedAt: new Date().toISOString()
    };
    
    if (!dataToSave.id) delete dataToSave.id;

    if (isAuto) {
      console.log("🟡 Saving as AUTO DRAFT...");
      
      // 👇 FIX: Use .filter() to find the existing auto-draft
      const existingAuto = await db.drafts.where('storeId').equals(currentStore.id).filter(d => d.isAuto === true).first();
      
      if (existingAuto) {
        await db.drafts.update(existingAuto.id, dataToSave);
        console.log("✅ Updated existing auto-draft");
      } else {
        dataToSave.createdAt = new Date().toISOString();
        await db.drafts.add(dataToSave);
        console.log("✅ Created new auto-draft");
      }
      
      // 👇 FIX: Use .filter() to read it back
      const updatedAuto = await db.drafts.where('storeId').equals(currentStore.id).filter(d => d.isAuto === true).first();
      
      console.log("🟢 Store autoDraft state updated to:", updatedAuto ? "OBJECT (Name: " + updatedAuto.name + ")" : "NULL");
      set({ autoDraft: updatedAuto || null });
    } else {
      console.log("🟡 Saving as MANUAL DRAFT...");
      if (dataToSave.id) {
        await db.drafts.update(dataToSave.id, dataToSave);
      } else {
        dataToSave.createdAt = new Date().toISOString();
        await db.drafts.add(dataToSave);
      }
      await get().fetchDrafts();
    }
  },

  clearAutoDraft: async () => {
    console.log("🔴 clearAutoDraft called!");
    const { currentStore } = get();
    if (!currentStore) return;
    await db.drafts.where('storeId').equals(currentStore.id).filter(d => d.isAuto === true).delete();
    set({ autoDraft: null });
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
      await get().fetchDrafts();
      set({ view: 'home' });
    } catch (error) {
      console.error("DB init failed:", error);
      set({ view: 'home', currentStore: { name: 'My Business', ownerName: 'Owner' }, customers: [] });
    }
  }
}));

export default useStore;