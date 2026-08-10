import { useState, useEffect, useMemo } from "react";
import { Search, Plus, Phone, MessageCircle, DollarSign, ShoppingCart, X, Clock, AlertCircle, Star, ChevronRight } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency } from "../utils/helpers";
import { openWhatsApp, openDialer } from "../utils/communication";
import { CustomerService } from "../services/CustomerService";
import { TransactionService } from "../services/TransactionService";
import { AddCustomerModal } from "../components/customer/AddCustomerModal";
import { TopBar } from "../components/TopBar";

export const CustomersPage = () => {
  const {
    currentStore, 
    setSelectedCustomer, setView, setPrefillTransaction
  } = useStore();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionCustomer, setActionCustomer] = useState(null);
  
  // 👇 NEW: Local state to hold customers with their mathematically true balances
  const [customersData, setCustomersData] = useState([]);
  
  const currency = currentStore?.currency || "GH₵";

  // 1. Load Data & Calculate True Balances (Single Source of Truth)
  useEffect(() => {
    const loadData = async () => {
      if (!currentStore?.id) return;
      try {
        const [customers, transactions] = await Promise.all([
          CustomerService.getAll(currentStore.id),
          TransactionService.getAll(currentStore.id)
        ]);

        const trueBalances = {};
        customers.forEach(c => { trueBalances[c.id] = 0; });

        transactions.forEach(tx => {
          const isActive = tx.status === 'active' || !tx.status;
          if (!isActive) return;

          if (!trueBalances[tx.contactId]) trueBalances[tx.contactId] = 0;

          if (tx.type === 'sale') {
            trueBalances[tx.contactId] += (parseFloat(tx.amount) || 0);
            trueBalances[tx.contactId] -= (parseFloat(tx.paid) || 0);
          } else if (tx.type === 'payment') {
            trueBalances[tx.contactId] -= (parseFloat(tx.paid) || 0);
          }
        });

        const customersWithTrueBalance = customers.map(c => ({
          ...c,
          trueBalance: trueBalances[c.id] || 0
        }));

        setCustomersData(customersWithTrueBalance);
      } catch (error) {
        console.error("Failed to load customers data", error);
      }
    };
    loadData();
  }, [currentStore?.id]);

  // 2. SMART SEARCH
  const filteredCustomers = useMemo(() => {
    if (!Array.isArray(customersData)) return [];
    if (!searchQuery.trim()) return customersData;
    const q = searchQuery.toLowerCase();
    return customersData.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q)) ||
      (c.lastBought && c.lastBought.toLowerCase().includes(q))
    );
  }, [customersData, searchQuery]);

  // 3. SECTIONING LOGIC
  const sections = useMemo(() => {
    const favorites = [];
    const needAttention = [];
    const recentlyActive = [];
    const others = [];
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    filteredCustomers.forEach(c => {
      if (searchQuery.trim()) {
        others.push(c);
        return;
      }
      const lastActiveDate = c.lastActivity ? new Date(c.lastActivity) : null;
      const isRecent = lastActiveDate && lastActiveDate >= thirtyDaysAgo;

      if (c.isFavourite || c.isPinned) {
        favorites.push(c);
      } else if (c.trueBalance > 0) { // 👈 Use trueBalance
        needAttention.push(c);
      } else if (isRecent) {
        recentlyActive.push(c);
      } else {
        others.push(c);
      }
    });

    needAttention.sort((a, b) => b.trueBalance - a.trueBalance); // 👈 Sort by trueBalance
    recentlyActive.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));
    others.sort((a, b) => a.name.localeCompare(b.name));

    return { favorites, needAttention, recentlyActive, others };
  }, [filteredCustomers, searchQuery]);

  // 4. QUICK ACTIONS
  const handleRecordSale = (customer) => {
    setActionCustomer(null);
    setSelectedCustomer(customer);
    setPrefillTransaction({
      customerId: customer.id, name: customer.name, phone: customer.phone,
      items: "", amount: "", paid: "0"
    });
    setView("record");
  };

  const handleReceivePayment = (customer) => {
    setActionCustomer(null);
    setSelectedCustomer(customer);
    setPrefillTransaction({
      customerId: customer.id, name: customer.name, phone: customer.phone,
      items: "Payment", amount: "0", paid: ""
    });
    setView("recordPayment"); // 👈 Updated to use the new dedicated payment page
  };

  const handleViewProfile = (customer) => {
    setActionCustomer(null);
    setSelectedCustomer(customer);
    setView("profile");
  };

  const generateMessage = (c) =>
    `Hello ${c.name}, this is ${currentStore?.name || "Store"}. Please send your outstanding balance of ${formatCurrency(c.trueBalance, currency)} by the end of the week. Thank you!`;

  const getDaysOverdue = (lastActivity) => {
    if (!lastActivity) return null;
    const days = Math.floor((new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24));
    return days > 7 ? days : null;
  };

  const renderCustomerCard = (customer) => {
    const daysOverdue = getDaysOverdue(customer.lastActivity);
    // Fallback to customer.balance just in case, but trueBalance is primary
    const balance = customer.trueBalance !== undefined ? customer.trueBalance : customer.balance;

    return (
      <button 
        key={customer.id} 
        onClick={() => handleViewProfile(customer)}
        className="w-full bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 text-left active:scale-[0.98] transition relative overflow-hidden"
      >
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
            balance > 0 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
          }`}>
            {customer.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-gray-900 dark:text-white truncate">{customer.name}</p>
              {(customer.isFavourite || customer.isPinned) && <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 flex items-center gap-1">
              <Phone size={10} /> {customer.phone || "No phone"}
            </p>
            {(customer.lastActivity || customer.lastBought) && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                <Clock size={10} /> 
                {customer.lastBought ? `Last bought: ${customer.lastBought}` : "No recent activity"}
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
          {data.map(renderCustomerCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Customers" />
      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto">
        
        {/* Search & Add Button */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, or product..."
              className="w-full pl-9 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white text-sm"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-xl flex items-center gap-1.5 font-bold text-sm active:scale-95 transition shadow-md"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Sections */}
        <div className="pb-8">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 mt-4">
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {searchQuery ? "No customers found" : "No customers yet"}
              </p>
            </div>
          ) : (
            <>
              {renderSection("Search Results", null, filteredCustomers)}
              {!searchQuery && renderSection("⭐ Favorites", <Star size={12} />, sections.favorites)}
              {!searchQuery && renderSection("🔴 Need Attention", <AlertCircle size={12} />, sections.needAttention)}
              {!searchQuery && renderSection("🕒 Recently Active", <Clock size={12} />, sections.recentlyActive)}
              {!searchQuery && renderSection("👥 All Customers", null, sections.others)}
            </>
          )}
        </div>
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* ACTION BOTTOM SHEET */}
      {actionCustomer && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setActionCustomer(null)}>
          <div 
            className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-3xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{actionCustomer.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {actionCustomer.trueBalance > 0 ? `Owes ${formatCurrency(actionCustomer.trueBalance, currency)}` : "Paid Up"}
                </p>
              </div>
              <button onClick={() => setActionCustomer(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleRecordSale(actionCustomer)}
                className="flex flex-col items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl active:scale-95 transition"
              >
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
                  <ShoppingCart size={24} />
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">Record Sale</span>
              </button>
              <button 
                onClick={() => handleReceivePayment(actionCustomer)}
                className="flex flex-col items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl active:scale-95 transition"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                  <DollarSign size={24} />
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">Receive Payment</span>
              </button>
              <button 
                onClick={() => { setActionCustomer(null); openDialer(actionCustomer.phone); }}
                className="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl active:scale-95 transition"
              >
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center">
                  <Phone size={24} />
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">Call</span>
              </button>
              <button 
                onClick={() => { setActionCustomer(null); openWhatsApp(actionCustomer.phone, generateMessage(actionCustomer)); }}
                className="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl active:scale-95 transition"
              >
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center">
                  <MessageCircle size={24} />
                </div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">WhatsApp</span>
              </button>
            </div>
            <button 
              onClick={() => handleViewProfile(actionCustomer)}
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