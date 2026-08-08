import { useState } from "react";
import { Home, Users, Truck, Plus, X, ShoppingCart, Banknote, ArrowDownCircle, ArrowUpCircle, Menu } from "lucide-react";
import useStore from "../store/useStore";

export const BottomNav = () => {
  const { view, setView } = useStore();
  const [showFabMenu, setShowFabMenu] = useState(false);

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "customers", label: "Customers", icon: Users },
    { id: "fab", label: "Record", icon: Plus, isFab: true },
    { id: "suppliers", label: "Suppliers", icon: Truck },
    { id: "settings", label: "More", icon: Menu },
  ];

  const handleNavClick = (item) => {
    if (item.isFab) {
      setShowFabMenu(true);
    } else {
      setView(item.id);
      setShowFabMenu(false);
    }
  };

  const handleFabAction = (action) => {
    setShowFabMenu(false);
    if (action === "sale") setView("record");
    if (action === "purchase") setView("recordSupplierPurchase");
    if (action === "customerPayment") setView("record");
    if (action === "supplierPayment") setView("recordSupplierPurchase");
  };

  return (
    <>
      {/* Main Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe z-40">
        <div className="flex items-center justify-around max-w-lg mx-auto h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = view === item.id && !item.isFab;

            if (item.isFab) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className="relative -top-5 bg-indigo-600 hover:bg-indigo-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-gray-50 dark:border-gray-950 active:scale-95 transition-transform"
                >
                  <Plus size={28} strokeWidth={2.5} />
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 👇 FAB Bottom Sheet Menu with New Plain-English Labels */}
      {showFabMenu && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowFabMenu(false)}>
          <div 
            className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-3xl p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">What do you want to do?</h3>
              <button onClick={() => setShowFabMenu(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 👇 SELL TO CUSTOMER */}
              <button 
                onClick={() => handleFabAction("sale")}
                className="flex flex-col items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl active:scale-95 transition"
              >
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
                  <ShoppingCart size={24} />
                </div>
                <div className="text-center">
                  <span className="font-bold text-gray-900 dark:text-white text-sm block">Sell to Customer</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Record a sale</span>
                </div>
              </button>

              {/* 👇 BUY FROM SUPPLIER */}
              <button 
                onClick={() => handleFabAction("purchase")}
                className="flex flex-col items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl active:scale-95 transition"
              >
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                  <Truck size={24} />
                </div>
                <div className="text-center">
                  <span className="font-bold text-gray-900 dark:text-white text-sm block">Buy from Supplier</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Record a purchase</span>
                </div>
              </button>

              {/* 👇 RECEIVE PAYMENT */}
              <button 
                onClick={() => handleFabAction("customerPayment")}
                className="flex flex-col items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl active:scale-95 transition"
              >
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                  <ArrowDownCircle size={24} />
                </div>
                <div className="text-center">
                  <span className="font-bold text-gray-900 dark:text-white text-sm block">Receive Payment</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">From a customer</span>
                </div>
              </button>

              {/* 👇 PAY SUPPLIER */}
              <button 
                onClick={() => handleFabAction("supplierPayment")}
                className="flex flex-col items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl active:scale-95 transition"
              >
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center">
                  <ArrowUpCircle size={24} />
                </div>
                <div className="text-center">
                  <span className="font-bold text-gray-900 dark:text-white text-sm block">Pay Supplier</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Settle a debt</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};