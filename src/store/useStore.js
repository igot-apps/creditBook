import { create } from 'zustand';
import { db } from '../database/db';
import { ContactService } from '../services/ContactService';
// 👇 NEW: Import the Suspended Transaction Service
import { SuspendedTransactionService } from '../services/SuspendedTransactionService';

// 👇 SAFARI FIX: Safe LocalStorage wrapper to prevent crashes in Private Browsing
const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn('LocalStorage blocked (likely Safari Private Mode)');
    }
  }
};

const useStore = create((set, get) => ({
  view: 'home',
  theme: safeLocalStorage.getItem('cb_theme') || 'light',
  toast: null,
  showConfetti: false,
  currentStore: null,
  customers: [],
  suppliers: [],
  selectedCustomer: null,
  selectedSupplier: null,
  prefillTransaction: null,
  fixTransaction: null,
  drafts: [],
  autoDraft: null,
  isMenuOpen: false,
  pageKey: Date.now(),
  lastScrollPosition: 0,
  
  // 👇 NEW: Suspended Transactions State
  suspendedTransactions: [],
  resumedSuspendedId: null,

  setView: (view) => set({ view }),
  refreshPage: () => set({ pageKey: Date.now() }),
  setLastScrollPosition: (pos) => set({ lastScrollPosition: pos }),
  setTheme: (theme) => {
    safeLocalStorage.setItem('cb_theme', theme);
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
  setSuppliers: (suppliers) => set({ suppliers }),
  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
  setSelectedSupplier: (supplier) => set({ selectedSupplier: supplier }),
  setPrefillTransaction: (tx) => set({ prefillTransaction: tx }),
  setFixTransaction: (tx) => set({ fixTransaction: tx }),
  setIsMenuOpen: (isOpen) => set({ isMenuOpen: isOpen }),

  fetchDrafts: async () => {
    const { currentStore } = get();
    if (!currentStore) return;
    try {
      const loaded = await db.drafts.where('storeId').equals(currentStore.id).filter(d => !d.isAuto).reverse().sortBy('createdAt');
      const auto = await db.drafts.where('storeId').equals(currentStore.id).filter(d => d.isAuto === true).first();
      set({ drafts: loaded, autoDraft: auto || null });
    } catch (error) {
      console.error("Failed to fetch drafts:", error);
    }
  },

  saveDraft: async (draftData, isAuto = false) => {
    const { currentStore } = get();
    if (!currentStore) return;
    try {
      const dataToSave = {
        id: draftData.id || `draft_${Date.now()}`,
        ...draftData,
        storeId: currentStore.id,
        isAuto: isAuto,
        updatedAt: new Date().toISOString()
      };
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
    } catch (error) {
      console.error("Failed to save draft:", error);
    }
  },

  clearAutoDraft: async () => {
    const { currentStore } = get();
    if (!currentStore) return;
    try {
      await db.drafts.where('storeId').equals(currentStore.id).filter(d => d.isAuto === true).delete();
      set({ autoDraft: null });
    } catch (error) {
      console.error("Failed to clear auto draft:", error);
    }
  },

  deleteDraft: async (id) => {
    try {
      await db.drafts.delete(id);
      await get().fetchDrafts();
    } catch (error) {
      console.error("Failed to delete draft:", error);
    }
  },

  refreshCustomers: async () => {
    const { currentStore } = get();
    if (!currentStore) return [];
    try {
      const loaded = await ContactService.getAll(currentStore.id, 'customer');
      set({ customers: loaded });
      return loaded;
    } catch (error) {
      console.error("Failed to refresh customers:", error);
      return [];
    }
  },

  // ==========================================
  // 👇 NEW: SUSPENDED TRANSACTIONS ACTIONS
  // ==========================================

  loadSuspendedTransactions: async (storeId) => {
    try {
      const txs = await SuspendedTransactionService.getSuspendedTransactions(storeId);
      set({ suspendedTransactions: txs });
      // Run silent cleanup for records older than 7 days
      SuspendedTransactionService.cleanupOldSuspended(storeId);
    } catch (error) {
      console.error("Failed to load suspended transactions", error);
    }
  },

  suspendTransaction: async (data) => {
    try {
      const id = await SuspendedTransactionService.suspendTransaction(data);
      // Refresh the list from the database
      const txs = await SuspendedTransactionService.getSuspendedTransactions(data.storeId);
      // Clear auto-draft when explicitly suspended to prevent conflicts
      set({ suspendedTransactions: txs, autoDraft: null }); 
      return id;
    } catch (error) {
      console.error("Failed to suspend transaction", error);
      throw error;
    }
  },

  resumeSuspendedTransaction: (id) => {
    // Clear auto-draft and set the ID so the Record page knows what to load
    set({ resumedSuspendedId: id, autoDraft: null }); 
  },

  clearResumedSuspended: () => {
    set({ resumedSuspendedId: null });
  },

  deleteSuspendedTransaction: async (id, storeId) => {
    try {
      await SuspendedTransactionService.deleteSuspendedTransaction(id);
      // Refresh the list
      const txs = await SuspendedTransactionService.getSuspendedTransactions(storeId);
      set({ suspendedTransactions: txs });
    } catch (error) {
      console.error("Failed to delete suspended transaction", error);
    }
  },

  checkDuplicateSuspended: async (storeId, contactId, type) => {
    return await SuspendedTransactionService.getSuspendedByContact(storeId, contactId, type);
  },

  initializeApp: async () => {
    try {
      let store = await db.stores.toCollection().first();
      if (!store) {
        const mobileSafeId = 'store_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        const defaultStore = {
          id: mobileSafeId,
          name: 'My Business',
          ownerName: 'Owner',
          email: '',
          phone: '',
          currency: 'GH₵',
          createdAt: new Date().toISOString()
        };
        await db.stores.add(defaultStore);
        store = defaultStore;
      }
      set({ currentStore: store });
      const customers = await ContactService.getAll(store.id, 'customer');
      const suppliers = await ContactService.getAll(store.id, 'supplier');
      set({ customers, suppliers });
      await get().fetchDrafts();
      
      //  NEW: Load suspended transactions on app startup
      await get().loadSuspendedTransactions(store.id);
      
      set({ view: 'home' });
    } catch (error) {
      console.error("DB init failed (Safari fallback triggered):", error);
      set({ 
        view: 'home', 
        currentStore: { name: 'My Business', ownerName: 'Owner', currency: 'GH₵' }, 
        customers: [],
        suppliers: []
      });
    }
  }
}));

export default useStore;