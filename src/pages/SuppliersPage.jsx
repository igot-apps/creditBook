import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Truck, Phone, MessageCircle, DollarSign, ShoppingCart, X, Clock, AlertCircle, Star, ChevronRight } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { openWhatsApp, openDialer } from "../utils/communication";
import { SupplierService } from "../services/SupplierService";
import { TransactionService } from "../services/TransactionService";
import { AddSupplierModal } from "../components/supplier/AddSupplierModal";
import { TopBar } from "../components/TopBar";

export const SuppliersPage = () => {
  const {
    currentStore,
    setSelectedSupplier,
    setView,
    setPrefillTransaction
  } = useStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionSupplier, setActionSupplier] = useState(null);
  
  // 👇 Local state to hold suppliers with their mathematically true balances
  const [suppliersData, setSuppliersData] = useState([]);
  
  const currency = currentStore?.currency || "GH₵";

  // 1. Load Data & Calculate True Balances (Single Source of Truth)
  const fetchSuppliers = async () => {
    if (!currentStore?.id) return;
    try {
      const [suppliers, transactions] = await Promise.all([
        SupplierService.getAll(currentStore.id),
        TransactionService.getAll(currentStore.id)
      ]);

      const trueBalances = {};
      suppliers.forEach(s => { trueBalances[s.id] = 0; });

      transactions.forEach(tx => {
        const isActive = tx.status === 'active' || !tx.status;
        if (!isActive) return;

        if (!trueBalances[tx.contactId]) trueBalances[tx.contactId] = 0;

        if (tx.type === 'purchase') {
          trueBalances[tx.contactId] += (parseFloat(tx.amount) || 0);
          trueBalances[tx.contactId] -= (parseFloat(tx.paid) || 0);
        } else if (tx.type === 'supplier_payment') {
          trueBalances[tx.contactId] -= (parseFloat(tx.paid) || 0);
        }
      });

      const suppliersWithTrueBalance = suppliers.map(s => ({
        ...s,
        trueBalance: trueBalances[s.id] || 0
      }));

      setSuppliersData(suppliersWithTrueBalance);
    } catch (error) {
      console.error("Failed to load suppliers data", error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [currentStore?.id]);

  // 2. SMART SEARCH
  const filteredSuppliers = useMemo(() => {
    if (!Array.isArray(suppliersData)) return [];
    if (!searchQuery.trim()) return suppliersData;
    const q = searchQuery.toLowerCase();
    return suppliersData.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.phone && s.phone.includes(q)) ||
      (s.lastSupplied && s.lastSupplied.toLowerCase().includes(q))
    );
  }, [suppliersData, searchQuery]);

  // 3. SECTIONING LOGIC
  const sections = useMemo(() => {
    const favorites = [];
    const needAttention = [];
    const recentlyActive = [];
    const others = [];
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    filteredSuppliers.forEach(s => {
      if (searchQuery.trim()) {
        others.push(s);
        return;
      }
      const lastActiveDate = s.lastActivity ? new Date(s.lastActivity) : null;
      const isRecent = lastActiveDate && lastActiveDate >= thirtyDaysAgo;

      if (s.isFavourite || s.isPinned) {
        favorites.push(s);
      } else if (s.trueBalance > 0) { // 👈 Use trueBalance
        needAttention.push(s);
      } else if (isRecent) {
        recentlyActive.push(s);
      } else {
        others.push(s);
      }
    });

    needAttention.sort((a, b) => b.trueBalance - a.trueBalance); // 👈 Sort by trueBalance
    recentlyActive.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    others.sort((a, b) => a.name.localeCompare(b.name));

    return { favorites, needAttention, recentlyActive, others };
  }, [filteredSuppliers, searchQuery]);

  // 4. QUICK ACTIONS
  const handleRecordPurchase = (supplier) => {
    setActionSupplier(null);
    setSelectedSupplier(supplier);
    setPrefillTransaction({
      supplierId: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      type: "purchase",
      items: "",
      amount: "",
      paid: ""
    });
    setView("recordSupplierPurchase");
  };

  const handleMakePayment = (supplier) => {
    setActionSupplier(null);
    setSelectedSupplier(supplier);
    setPrefillTransaction({
      supplierId: supplier.id,
      name: supplier.name,
      phone: supplier.phone,
      type: "payment",
      items: "Payment",
      amount: "0",
      paid: ""
    });
    setView("recordSupplierPayment");
  };

  const handleViewProfile = (supplier) => {
    setActionSupplier(null);
    setSelectedSupplier(supplier);
    setView("supplierProfile");
  };

  const generateMessage = (s) =>
    `Hello ${s.name}, this is ${currentStore?.name || "Store"}. I will send your ${formatCurrency(s.trueBalance, currency)} by the end of the week. Thank you!`;

  const getDaysOverdue = (lastActivity) => {
    if (!lastActivity) return null;
    const days = Math.floor((new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24));
    return days > 7 ? days : null;
  };

  const renderSupplierCard = (supplier) => {
    const daysOverdue = getDaysOverdue(supplier.lastActivity);
    // Fallback to supplier.balance just in case, but trueBalance is primary
    const balance = supplier.trueBalance !== undefined ? supplier.trueBalance : supplier.balance;

    return (
      <button 
        key={supplier.id} 
        onClick={() => handleViewProfile(supplier)}
        className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-left active:scale-[0.98] transition relative overflow-hidden"
      >
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
            balance > 0 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
          }`}>
            {supplier.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 dark:text-white truncate">{supplier.name}</p>
              {(supplier.isFavourite || supplier.isPinned) && <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
              <Phone size={10} /> {supplier.phone || "No phone"}
            </p>
            {(supplier.lastActivity || supplier.lastSupplied) && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                <Clock size={10} /> 
                {supplier.lastSupplied ? `Last supplied: ${supplier.lastSupplied}` : "No recent activity"}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
            {balance > 0 ? (
              <>
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(balance, currency)}
                </p>
                {daysOverdue && (
                  <span className="text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                    <AlertCircle size={8} /> {daysOverdue} days
                  </span>
                )}
              </>
            ) : balance < 0 ? (
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                Credit {formatCurrency(Math.abs(balance), currency)}
              </p>
            ) : (
              <p className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">
                Paid Up
              </p>
            )}
          </div>
        </div>
      </button>
    );
  };

  const renderSection = (title, icon, data) => {
    if (searchQuery.trim() && title !== "Search Results") return null;
    if (data.length === 0) return null;
    return (
      <div className="mt-6 first:mt-0">
        <h3 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
          {icon} {title} <span className="text-gray-400 dark:text-gray-600 font-normal">({data.length})</span>
        </h3>
        <div className="space-y-3">
          {data.map(renderSupplierCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Suppliers" />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto">
        
        {/* Search & Add Button */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, or product..."
              className="w-full pl-9 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl flex items-center gap-1.5 font-bold text-sm active:scale-95 transition shadow-md"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Sections */}
        <div className="pb-8">
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 mt-4">
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {searchQuery ? "No suppliers found" : "No suppliers yet"}
              </p>
            </div>
          ) : (
            <>
              {renderSection("Search Results", null, filteredSuppliers)}
              {!searchQuery && renderSection("⭐ Favorites", <Star size={12} />, sections.favorites)}
              {!searchQuery && renderSection("🔴 Need Attention", <AlertCircle size={12} />, sections.needAttention)}
              {!searchQuery && renderSection("🕒 Recently Active", <Clock size={12} />, sections.recentlyActive)}
              {!searchQuery && renderSection("👥 All Suppliers", null, sections.others)}
            </>
          )}
        </div>
      </div>

      {/* 👇 UPDATED: Add Supplier Modal with onSaved callback to refresh the list */}
      <AddSupplierModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSaved={fetchSuppliers} // 👈 THIS TRIGGERS THE REFRESH INSTANTLY
      />

      {/* ACTION BOTTOM SHEET */}
      {actionSupplier && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setActionSupplier(null)}>
          <div 
            className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-3xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{actionSupplier.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {actionSupplier.trueBalance > 0 ? `I owe ${formatCurrency(actionSupplier.trueBalance, currency)}` : "All Paid Up"}
                </p>
              </div>
              <button onClick={() => setActionSupplier(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleRecordPurchase(actionSupplier)}
                className="flex flex-col items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl active:scale-95 transition"
              >
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                  <ShoppingCart size={24} />
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">Record Purchase</span>
              </button>
              <button 
                onClick={() => handleMakePayment(actionSupplier)}
                className="flex flex-col items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl active:scale-95 transition"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                  <DollarSign size={24} />
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">Make Payment</span>
              </button>
              <button 
                onClick={() => { setActionSupplier(null); openDialer(actionSupplier.phone); }}
                className="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl active:scale-95 transition"
              >
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center">
                  <Phone size={24} />
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">Call</span>
              </button>
              <button 
                onClick={() => { setActionSupplier(null); openWhatsApp(actionSupplier.phone, generateMessage(actionSupplier)); }}
                className="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl active:scale-95 transition"
              >
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center">
                  <MessageCircle size={24} />
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">WhatsApp</span>
              </button>
            </div>
            <button 
              onClick={() => handleViewProfile(actionSupplier)}
              className="w-full mt-4 py-3 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition flex items-center justify-center gap-1"
            >
              View Full Profile <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};