import React, { useState, useEffect, useMemo } from "react";
import {
  Home, Users, PlusCircle, BarChart3, Settings, Search, Phone,
  MessageSquare, Mic, X, Check, Store, ChevronRight, Gift, MessageCircle, 
  AlertCircle 
} from "lucide-react";
import { StoreRepository } from "./repositories/StoreRepository";
import { CustomerService } from "./services/CustomerService";

// --- 🇬🇭 GHANA INSPIRED THEME & UTILS ---
const formatCurrency = (n) => `GHS ${Number(n || 0).toFixed(2)}`;
const formatDate = (d) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const LANG = {
  en: { 
    home: "Home", customers: "Customers", record: "Record Sale", reports: "Reports", settings: "Settings", 
    search: "Search name or phone...", save: "Save Transaction", voiceHint: "Tap mic to simulate voice entry",
    whatsapp: "WhatsApp", sms: "SMS", call: "Call Customer"
  }
};

// --- 🎉 CONFETTI COMPONENT ---
const Confetti = () => (
  <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
    {[...Array(30)].map((_, i) => (
      <div key={i} className="absolute animate-bounce" style={{
        left: `${Math.random() * 100}%`, top: `-10%`,
        animation: `fall ${2 + Math.random() * 3}s linear forwards`,
        color: ["#006B3F", "#FCD116", "#CE1126"][Math.floor(Math.random() * 3)],
        fontSize: `${16 + Math.random() * 20}px`
      }}>🎉</div>
    ))}
    <style>{`@keyframes fall { 100% { transform: translateY(110vh) rotate(720deg); } }`}</style>
  </div>
);

// --- 📱 ZERO-COST COMMUNICATION HELPERS ---
const openSMS = (phone, message) => {
  window.location.href = `sms:${phone.replace(/\s+/g, "")}?body=${encodeURIComponent(message)}`;
};
const openWhatsApp = (phone, message) => {
  const cleanPhone = phone.replace(/\s+/g, "").replace(/^0/, "233");
  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
};
const openDialer = (phone) => {
  window.location.href = `tel:${phone.replace(/\s+/g, "")}`;
};

// --- 📱 MAIN APP COMPONENT ---
export default function CreditBook() {
  const [view, setView] = useState("onboarding"); 
  const [showConfetti, setShowConfetti] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [store, setStore] = useState({ name: "Shalom Cloth Store", owner: "Ama", phone: "0240000000" });
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [tx, setTx] = useState({ customerId: null, name: "", phone: "", items: "", amount: "", paid: "" });
  const [isListening, setIsListening] = useState(false);

  // -- Initial Data Load --
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

  // -- Helpers --
  const t = (key) => LANG.en[key] || key;
  const totalDebt = useMemo(() => customers.reduce((sum, c) => sum + Math.max(0, c.balance || 0), 0), [customers]);
  const todaySales = useMemo(() => {
    const today = new Date().toDateString();
    return customers.reduce((sum, c) => sum + (c.history || []).filter(h => new Date(h.date).toDateString() === today).reduce((s, h) => s + (h.amount || 0), 0), 0);
  }, [customers]);

  const generateReminderMessage = (c) => {
    if (c.balance < 0) {
      const credit = Math.abs(c.balance);
      return `Hello ${c.name}, thank you for your payment! You currently have a credit balance of ${formatCurrency(credit)} with ${store.name}. This will be applied to your next purchase.`;
    }
    if (c.balance === 0) {
      return `Hello ${c.name}, thank you! Your account with ${store.name} is fully settled.`;
    }
    return `Hello ${c.name}, this is a reminder from ${store.name}. Your current outstanding balance is ${formatCurrency(c.balance)}. Please visit us or send payment via MoMo. Thank you!`;
  };

  // -- Actions --
  const completeOnboarding = async () => {
    localStorage.setItem("cb_onboarded", "true"); // Only keeping this one tiny flag for onboarding flow
    setView("home");
  };

  const simulateVoice = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      setTx(prev => ({ ...prev, name: "Akosua Mensah", phone: "024 123 4567", items: "2 bags rice, 1 tin oil", amount: "250", paid: "100" }));
    }, 1500);
  };

  const saveTransaction = async () => {
    const amount = parseFloat(tx.amount) || 0;
    const paid = parseFloat(tx.paid) || 0;
    if (amount === 0 && paid === 0) return;

    setIsLoading(true);
    try {
      const updatedCustomer = await CustomerService.addTransaction(
        tx.customerId, tx.name, tx.phone, amount, paid, tx.items
      );
      
      // Update local state
      setCustomers(prev => {
        const others = prev.filter(c => c.id !== updatedCustomer.id);
        return [updatedCustomer, ...others];
      });

      if (updatedCustomer.balance === 0 && paid > 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      setTx({ customerId: null, name: "", phone: "", items: "", amount: "", paid: "" });
      setView("home");
    } catch (error) {
      console.error("Failed to save transaction", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsPaid = async (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer || customer.balance <= 0) return;

    setIsLoading(true);
    try {
      const updatedCustomer = await CustomerService.clearDebt(customerId);
      setCustomers(prev => prev.map(c => c.id === customerId ? updatedCustomer : c));
      setSelectedCustomer(updatedCustomer); // Update profile view if open
      
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } catch (error) {
      console.error("Failed to clear debt", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-green-700 font-bold text-xl animate-pulse">Loading CreditBook...</div>
      </div>
    );
  }

  // --- 🖼️ VIEWS (Onboarding, Record, Profile, Home) ---
  // (Keeping the exact same beautiful UI structure, just powered by the new async services)
  
  if (view === "onboarding") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-green-700 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
          <Store className="text-yellow-400 w-12 h-12" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">CreditBook</h1>
        <p className="text-gray-500 mb-8 text-lg">The smart way to manage market sales and debts.</p>
        <div className="space-y-4 w-full max-w-sm">
          {["Track customers easily", "Never forget who owes you", "Send WhatsApp & SMS reminders yourself"].map((text, i) => (
            <div key={i} className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
              <Check className="text-green-600 w-6 h-6 flex-shrink-0" />
              <span className="text-gray-800 font-medium text-lg text-left">{text}</span>
            </div>
          ))}
        </div>
        <button onClick={completeOnboarding} className="mt-10 w-full max-w-sm bg-green-700 text-white font-bold text-xl py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">
          Get Started
        </button>
      </div>
    );
  }

  if (view === "record") {
    const currentBal = tx.customerId ? (customers.find(c => c.id === tx.customerId)?.balance || 0) : 0;
    const amountVal = parseFloat(tx.amount) || 0;
    const paidVal = parseFloat(tx.paid) || 0;
    const totalDue = currentBal + amountVal;
    const newBal = totalDue - paidVal; // Allow negative for credit
    const isOverpayment = paidVal > totalDue && totalDue > 0;

    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-green-700 text-white p-4 flex items-center gap-3 sticky top-0 z-20 shadow-md">
          <button onClick={() => setView("home")} className="p-2 bg-white/20 rounded-full"><X size={20} /></button>
          <h2 className="text-xl font-bold">Record Sale</h2>
        </div>

        <div className="p-4 space-y-4 max-w-lg mx-auto">
          <button onClick={simulateVoice} disabled={isListening} className="w-full bg-yellow-400 text-gray-900 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-md active:scale-95 transition-transform">
            <Mic className={isListening ? "animate-pulse" : ""} size={24} />
            {isListening ? "Listening..." : t("voiceHint")}
          </button>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
            <input placeholder="Customer Name" value={tx.name} onChange={e => setTx({...tx, name: e.target.value})} className="w-full text-lg font-semibold border-b border-gray-200 pb-2 outline-none focus:border-green-600" />
            <input placeholder="Phone Number (024...)" value={tx.phone} onChange={e => setTx({...tx, phone: e.target.value})} className="w-full text-lg text-gray-600 border-b border-gray-200 pb-2 outline-none focus:border-green-600" />
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div>
              <label className="text-gray-500 text-sm font-semibold uppercase">Items Bought (Optional)</label>
              <input placeholder="e.g., Rice, Oil, Cloth" value={tx.items} onChange={e => setTx({...tx, items: e.target.value})} className="w-full text-lg mt-1 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-500 text-sm font-semibold uppercase">Total Amount</label>
                <input type="number" placeholder="0.00" value={tx.amount} onChange={e => setTx({...tx, amount: e.target.value})} className="w-full text-2xl font-bold text-gray-900 mt-1 outline-none" />
              </div>
              <div>
                <label className="text-gray-500 text-sm font-semibold uppercase">Amount Paid</label>
                <input type="number" placeholder="0.00" value={tx.paid} onChange={e => setTx({...tx, paid: e.target.value})} className="w-full text-2xl font-bold text-green-700 mt-1 outline-none" />
              </div>
            </div>
          </div>

          {/* OVERPAYMENT WARNING */}
          {isOverpayment && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Overpayment Detected</p>
                <p className="text-sm mt-1">
                  The amount paid ({formatCurrency(paidVal)}) is greater than the total due ({formatCurrency(totalDue)}). 
                  This will create a <span className="font-bold">credit balance of {formatCurrency(Math.abs(newBal))}</span> for this customer.
                </p>
              </div>
            </div>
          )}

          {/* SMART SMS PREVIEW */}
          {(amountVal > 0 || paidVal > 0) && (
            <div className="bg-gray-900 text-gray-100 p-5 rounded-2xl shadow-xl relative">
              <div className="absolute top-3 right-3 bg-green-600 text-white text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                <MessageSquare size={12} /> Message Preview
              </div>
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">You can send this to {tx.name || "Customer"}:</p>
              <div className="font-mono text-sm leading-relaxed whitespace-pre-line">
                {`Balance update (${formatDate(new Date())}):\n`}
                {currentBal > 0 && `Old debt: GHS ${currentBal.toFixed(2)}\n`}
                {tx.items && amountVal > 0 && `Items: ${tx.items}\n`}
                {amountVal > 0 && `New Purchase: GHS ${amountVal.toFixed(2)}\n`}
                {paidVal > 0 && `Paid: GHS ${paidVal.toFixed(2)}\n`}
                {newBal < 0 
                  ? `New Balance: GHS 0.00\n(You have a credit of GHS ${Math.abs(newBal).toFixed(2)} with us)`
                  : `New Balance: GHS ${newBal.toFixed(2)}`}
                {`\nThank you! - ${store.name}`}
              </div>
            </div>
          )}

          <button onClick={saveTransaction} disabled={!tx.amount && !tx.paid} className="w-full bg-green-700 text-white font-bold text-xl py-4 rounded-2xl shadow-lg disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2">
            <Check size={24} /> {t("save")}
          </button>
        </div>
      </div>
    );
  }

  if (view === "profile" && selectedCustomer) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="bg-green-700 text-white p-4 flex items-center gap-3 sticky top-0 z-20">
          <button onClick={() => { setView("home"); setSelectedCustomer(null); }} className="p-2 bg-white/20 rounded-full"><ChevronRight className="rotate-180" size={20} /></button>
          <h2 className="text-xl font-bold">Customer Profile</h2>
        </div>
        <div className="p-4 max-w-lg mx-auto space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm text-center border border-gray-100">
            <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-gray-500">
              {selectedCustomer.name.charAt(0)}
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h3>
            <p className="text-gray-500 flex items-center justify-center gap-1 mt-1"><Phone size={16} /> {selectedCustomer.phone}</p>
                        <div className={`mt-4 text-4xl font-bold ${selectedCustomer.balance > 0 ? "text-red-600" : selectedCustomer.balance < 0 ? "text-blue-600" : "text-green-600"}`}>
              {selectedCustomer.balance < 0 ? `Credit: ${formatCurrency(Math.abs(selectedCustomer.balance))}` : formatCurrency(selectedCustomer.balance)}
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {selectedCustomer.balance < 0 ? "Customer has an advance balance" : "Current Balance"}
            </p>
            <p className="text-gray-500 text-sm mt-1">Current Balance</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => { setTx({ customerId: selectedCustomer.id, name: selectedCustomer.name, phone: selectedCustomer.phone, items: "", amount: "", paid: "" }); setView("record"); }} className="bg-green-700 text-white font-bold py-4 rounded-xl flex flex-col items-center gap-2 shadow-md active:scale-95 transition">
              <PlusCircle size={24} /> Add Purchase
            </button>
            <button onClick={() => markAsPaid(selectedCustomer.id)} disabled={selectedCustomer.balance <= 0} className="bg-yellow-400 text-gray-900 font-bold py-4 rounded-xl flex flex-col items-center gap-2 shadow-md disabled:opacity-50 active:scale-95 transition">
              <Gift size={24} /> Clear Debt
            </button>
            
            <button onClick={() => openWhatsApp(selectedCustomer.phone, generateReminderMessage(selectedCustomer))} className="bg-green-50 text-green-700 font-bold py-4 rounded-xl flex flex-col items-center gap-2 border border-green-200 shadow-sm active:scale-95 transition">
              <MessageCircle size={24} /> {t("whatsapp")}
            </button>
            <button onClick={() => openSMS(selectedCustomer.phone, generateReminderMessage(selectedCustomer))} className="bg-blue-50 text-blue-700 font-bold py-4 rounded-xl flex flex-col items-center gap-2 border border-blue-200 shadow-sm active:scale-95 transition">
              <MessageSquare size={24} /> {t("sms")}
            </button>
            <button onClick={() => openDialer(selectedCustomer.phone)} className="col-span-2 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl flex flex-col items-center gap-2 border border-gray-200 shadow-sm active:scale-95 transition">
              <Phone size={24} /> {t("call")}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 font-bold text-gray-700 flex justify-between items-center">
              <span>Transaction History</span>
              <button onClick={() => { setView("home"); setSelectedCustomer(null); }} className="text-sm text-green-700 font-semibold">Back to Home</button>
            </div>
            <div className="divide-y divide-gray-100">
              {[...selectedCustomer.history].reverse().map(h => (
                <div key={h.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900">{h.items || "General Purchase"}</p>
                    <p className="text-xs text-gray-500">{formatDate(h.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(h.amount)}</p>
                    <p className="text-xs text-green-600">Paid: {formatCurrency(h.paid)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- 🏠 DEFAULT DASHBOARD ---
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {showConfetti && <Confetti />}
      
      <div className="bg-green-700 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-green-100 text-sm font-medium">{store.name}</p>
            <h1 className="text-2xl font-bold">Good Day, {store.owner}!</h1>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Store size={20} />
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
          <p className="text-green-100 text-sm">Total Outstanding Debt</p>
          <p className="text-4xl font-bold mt-1">{formatCurrency(totalDebt)}</p>
        </div>
      </div>

      <div className="px-4 -mt-6 max-w-lg mx-auto space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-xs font-bold uppercase">Today's Sales</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(todaySales)}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-500 text-xs font-bold uppercase">Customers Owing</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{customers.filter(c => c.balance > 0).length}</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-gray-900">Recent Customers</h2>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input placeholder={t("search")} className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 shadow-sm" />
          </div>

          <div className="space-y-3">
            {customers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                <Users className="mx-auto text-gray-300 mb-2" size={48} />
                <p className="text-gray-500 font-medium">No customers yet</p>
                <button onClick={() => setView("record")} className="mt-3 text-green-700 font-bold">Add your first customer</button>
              </div>
            ) : (
              customers.slice(0, 10).map(c => (
                <div key={c.id} onClick={() => { setSelectedCustomer(c); setView("profile"); }} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${c.balance > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{c.name}</h3>
                      <p className="text-sm text-gray-500">{c.phone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${c.balance > 0 ? "text-red-600" : c.balance < 0 ? "text-blue-600" : "text-green-600"}`}>
                      {c.balance < 0 ? `Credit: ${formatCurrency(Math.abs(c.balance))}` : formatCurrency(c.balance)}
                    </p>
                    {c.balance > 200 && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">HIGH DEBT</span>}
                    {c.balance < 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">CREDIT</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-30 max-w-lg mx-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button onClick={() => setView("home")} className={`flex flex-col items-center gap-1 ${view === "home" ? "text-green-700" : "text-gray-400"}`}>
          <Home size={24} />
          <span className="text-[10px] font-bold">{t("home")}</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400">
          <Users size={24} />
          <span className="text-[10px] font-bold">{t("customers")}</span>
        </button>
        <button onClick={() => setView("record")} className="relative -top-6 bg-green-700 text-white p-4 rounded-full shadow-lg shadow-green-700/40 active:scale-90 transition-transform">
          <PlusCircle size={32} />
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400">
          <BarChart3 size={24} />
          <span className="text-[10px] font-bold">{t("reports")}</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400">
          <Settings size={24} />
          <span className="text-[10px] font-bold">{t("settings")}</span>
        </button>
      </div>
    </div>
  );
}