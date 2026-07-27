import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { StoreRepository } from "../repositories/StoreRepository";
import { CustomerService } from "../services/CustomerService";

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [view, setView] = useState("onboarding");
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem("cb_theme") || "light");
  const [toast, setToast] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [store, setStore] = useState({ name: "Shalom Cloth Store", owner: "Ama", phone: "0240000000" });
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Apply theme
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("cb_theme", theme);
  }, [theme]);

  // Initial data load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        let currentStore = await StoreRepository.get();
        if (!currentStore) {
          currentStore = { name: "Shalom Cloth Store", owner: "Ama", phone: "0240000000" };
          await StoreRepository.save(currentStore);
        }
        setStore(currentStore);

        const loadedCustomers = await CustomerService.getAllWithHistory();
        setCustomers(loadedCustomers);
        
        if (loadedCustomers.length > 0 || localStorage.getItem("cb_onboarded")) {
          setView("home");
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // Computed values
  const totalDebt = useMemo(() => customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0), [customers]);
  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return customers.reduce((sum, c) => sum + (c.history || []).filter(h => new Date(h.date).toDateString() === today).reduce((s, h) => s + (h.amount || 0), 0), 0);
  }, [customers]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const refreshCustomers = async () => {
    const loaded = await CustomerService.getAllWithHistory();
    setCustomers(loaded);
    return loaded;
  };

  const value = {
    view, setView, isLoading, setIsLoading,
    theme, setTheme,
    toast, showToast,
    showConfetti, triggerConfetti,
    store, setStore,
    customers, setCustomers, refreshCustomers,
    selectedCustomer, setSelectedCustomer,
    totalDebt, todaySales
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};