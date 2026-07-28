import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { AuthService } from "../services/AuthService";
import { CustomerService } from "../services/CustomerService";

const AppContext = createContext();
export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [view, setView] = useState("login");
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("cb_theme") || "light");
  const [toast, setToast] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [currentStore, setCurrentStore] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [prefillTransaction, setPrefillTransaction] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("cb_theme", theme);
  }, [theme]);

  // SaaS Auth Check on Load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const session = AuthService.getSession();
        if (session) {
          const store = await AuthService.getCurrentStore();
          if (store) {
            setCurrentStore(store);
            const loadedCustomers = await CustomerService.getAllWithHistory(store.id);
            setCustomers(loadedCustomers);
            setView("home");
          } else {
            AuthService.logout();
            setView("login");
          }
        } else {
          setView("login");
        }
      } catch (error) {
        console.error("Auth init failed:", error);
        setView("login");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Existing Stats
  const totalDebt = useMemo(() => customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0), [customers]);
  
  const todaySales = useMemo(() => {
    if (!currentStore) return 0;
    const today = new Date().toDateString();
    return customers.reduce((sum, c) => sum + (c.history || []).filter(h => new Date(h.date).toDateString() === today).reduce((s, h) => s + (h.amount || 0), 0), 0);
  }, [customers, currentStore]);

  // 👇 NEW STATS ADDED HERE
  const totalCustomers = customers.length;
  
  const moneyCollectedToday = useMemo(() => {
    if (!currentStore) return 0;
    const today = new Date().toDateString();
    return customers.reduce((sum, c) => sum + (c.history || []).filter(h => new Date(h.date).toDateString() === today).reduce((s, h) => s + (h.paid || 0), 0), 0);
  }, [customers, currentStore]);

  const recentActivity = useMemo(() => {
    if (!currentStore) return [];
    const allTx = customers.flatMap(c => (c.history || []).map(h => ({ ...h, customerName: c.name, customerId: c.id })));
    return allTx.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  }, [customers, currentStore]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const triggerConfetti = () => { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 3000); };

  const refreshCustomers = async () => {
    if (!currentStore) return [];
    const loaded = await CustomerService.getAllWithHistory(currentStore.id);
    setCustomers(loaded);
    return loaded;
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentStore(null);
    setCustomers([]);
    setView("login");
  };

  const handleLogin = async (email, password) => {
    console.log("🔵 Attempting login for:", email);
    try {
      const store = await AuthService.login(email, password);
      console.log("🟢 Login successful:", store.name);
      setCurrentStore(store);
      const loadedCustomers = await CustomerService.getAllWithHistory(store.id);
      setCustomers(loadedCustomers);
      setView("home");
    } catch (error) {
      console.error("🔴 Login error:", error);
      throw error;
    }
  };

  const handleRegister = async (storeData) => {
    console.log("🔵 Attempting registration for:", storeData.email);
    try {
      const store = await AuthService.register(
        storeData.storeName,
        storeData.ownerName,
        storeData.email,
        storeData.phone,
        storeData.password
      );
      console.log("🟢 Registration successful:", store.name);
      setCurrentStore(store);
      setCustomers([]);
      setView("home");
    } catch (error) {
      console.error("🔴 Registration error:", error);
      throw error;
    }
  };

  // 👇 UPDATED VALUE OBJECT WITH NEW STATS
  const value = {
    view, setView, isLoading, setIsLoading,
    theme, setTheme, toast, showToast, showConfetti, triggerConfetti,
    currentStore, setCurrentStore, customers, setCustomers, refreshCustomers,
    selectedCustomer, setSelectedCustomer, 
    totalDebt, todaySales, totalCustomers, moneyCollectedToday, recentActivity, // 👈 ADDED
    handleLogout, handleLogin, handleRegister,
    prefillTransaction, setPrefillTransaction,
    isMenuOpen, setIsMenuOpen
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};