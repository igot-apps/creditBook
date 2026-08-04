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
  selectedSupplier: null, // 👈 ADDED: State for selected supplier
  prefillTransaction: null,
  drafts: [],
  autoDraft: null,
  isMenuOpen: false,
  pageKey: Date.now(), 

  setView: (view) => set({ view }),
  refreshPage: () => set({ pageKey: Date.now() }),

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
  setSelectedSupplier: (supplier) => set({ selectedSupplier: supplier }), // 👈 ADDED: Function to set supplier
  setPrefillTransaction: (tx) => set({ prefillTransaction: tx }),
  setIsMenuOpen: (isOpen) => set({ isMenuOpen: isOpen }),

  fetchDrafts: async () => {
    const { currentStore } = get();
    if (!currentStore) return;
    
    const loaded = await db.drafts.where('storeId').equals(currentStore.id).filter(d => !d.isAuto).reverse().sortBy('createdAt');
    const auto = await db.drafts.where('storeId').equals(currentStore.id).filter(d => d.isAuto === true).first();
    
    set({ drafts: loaded, autoDraft: auto || null });
  },
  
  saveDraft: async (draftData, isAuto = false) => {
    const { currentStore } = get();
    if (!currentStore) return;
    
    const dataToSave = {
      ...draftData,
      storeId: currentStore.id,
      isAuto: isAuto,
      updatedAt: new Date().toISOString()
    };
    
    if (!dataToSave.id) delete dataToSave.id;

    if (isAuto) {
      const existingAuto = await db.drafts.where('storeId').equals(currentStore.id).filter(d => d.isAuto === true).first();
      
      if (existingAuto) {
        await db.drafts.update(existingAuto.id, dataToSave);
      } else {
        dataToSave.createdAt = new Date().toISOString();
        await db.drafts.add(dataToSave);
      }
      
      const updatedAuto = await db.drafts.where('storeId').equals(currentStore.id).filter(d => d.isAuto === true).first();
      set({ autoDraft: updatedAuto || null });
    } else {
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