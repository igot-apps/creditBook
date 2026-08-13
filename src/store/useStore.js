import { create } from 'zustand';

const useStore = create((set, get) => ({
  // --- Auth & Store State ---
  currentStore: null,
  setCurrentStore: (store) => set({ currentStore: store }),
  
  // --- Navigation State ---
  view: 'home',
  setView: (view) => set({ view }),
  pageKey: Date.now(),
  refreshPage: () => set({ pageKey: Date.now() }),

  // --- UI State ---
  theme: localStorage.getItem('theme') || 'light',
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },
  isMenuOpen: false,
  setIsMenuOpen: (isOpen) => set({ isMenuOpen: isOpen }),

  // --- Customer/Supplier Selection ---
  selectedCustomer: null,
  setSelectedCustomer: (customer) => set({ selectedCustomer: customer }),
  selectedSupplier: null,
  setSelectedSupplier: (supplier) => set({ selectedSupplier: supplier }),

  // --- Transaction State ---
  prefillTransaction: null,
  setPrefillTransaction: (data) => set({ prefillTransaction: data }),
  fixTransaction: null,
  setFixTransaction: (data) => set({ fixTransaction: data }),

  // --- Toast Notifications ---
  toast: null,
  showToast: (message) => {
    set({ toast: message });
    setTimeout(() => set({ toast: null }), 3000);
  },

  // --- Suspended Transactions (Resume Logic) ---
  resumedSuspendedId: null,
  setResumedSuspendedId: (id) => set({ resumedSuspendedId: id }),
  clearResumedSuspended: () => set({ resumedSuspendedId: null }),

  // --- Auto Draft (Separated for Sale and Purchase) ---
  autoDraft: null,
  saveDraft: (data, isAuto) => {
    const draft = { ...data, isAuto, updatedAt: new Date().toISOString() };
    // 👇 Use separate keys so they don't overwrite each other
    const key = draft.draftType === 'purchase' ? 'creditbook_draft_purchase' : 'creditbook_draft_sale';
    localStorage.setItem(key, JSON.stringify(draft));
    set({ autoDraft: draft });
  },
  clearAutoDraft: (type) => {
    if (type === 'purchase') localStorage.removeItem('creditbook_draft_purchase');
    else if (type === 'sale') localStorage.removeItem('creditbook_draft_sale');
    else {
      localStorage.removeItem('creditbook_draft_purchase');
      localStorage.removeItem('creditbook_draft_sale');
    }
    set({ autoDraft: null });
  },
  loadDraft: (type) => {
    const key = type === 'purchase' ? 'creditbook_draft_purchase' : 'creditbook_draft_sale';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        set({ autoDraft: parsed });
        return parsed;
      } catch (e) { console.error("Failed to load draft"); }
    }
    return null;
  },

  // --- Scroll Position ---
  lastScrollPosition: 0,
  setLastScrollPosition: (pos) => set({ lastScrollPosition: pos }),
}));

export default useStore;