import { useState } from "react";
import { Home, Users, Truck, MoreHorizontal, Plus, X, ShoppingCart, Banknote, DollarSign, Package, Settings, ChevronRight, Crown } from "lucide-react";
import useStore from "../store/useStore";

// Color styles for the quick action buttons
const colorStyles = {
  green: {
    container: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    icon: "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
  },
  indigo: {
    container: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
    icon: "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
  },
  blue: {
    container: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    icon: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
  },
  orange: {
    container: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    icon: "bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400"
  }
};

const QuickAction = ({ icon: Icon, label, color, onClick }) => {
  const styles = colorStyles[color] || colorStyles.green;
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2.5 p-4 border rounded-2xl active:scale-95 transition text-center ${styles.container}`}
    >
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${styles.icon}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="font-bold text-gray-900 dark:text-white text-sm">{label}</p>
      </div>
    </button>
  );
};

const MenuButton = ({ icon: Icon, title, subtitle, iconBg, onClick, badge }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl active:scale-[0.98] transition border border-gray-100 dark:border-gray-700"
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
        <Icon size={20} />
      </div>
      <div className="text-left">
        <p className="font-bold text-gray-900 dark:text-white">{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
      </div>
    </div>
    {badge ? (
      <span className="text-[9px] font-bold text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{badge}</span>
    ) : (
      <ChevronRight size={20} className="text-gray-400" />
    )}
  </button>
);

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    aria-current={active ? "page" : undefined}
    className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition active:scale-95 ${
      active ? "text-indigo-700 dark:text-indigo-300" : "text-gray-600 dark:text-gray-400"
    }`}
  >
    <span className={`grid h-7 w-10 place-items-center rounded-lg ${active ? "bg-indigo-100 dark:bg-indigo-900/60" : ""}`}>
      <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
    </span>
    <span className={`text-[11px] leading-tight ${active ? "font-bold" : "font-medium"}`}>{label}</span>
  </button>
);

export const BottomNav = () => {
  const { view, setView, setSelectedCustomer, setSelectedSupplier, readOnly } = useStore();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const closeAll = () => {
    setShowQuickAdd(false);
    setShowMoreMenu(false);
  };

  const navigate = (target) => {
    setSelectedCustomer(null);
    setSelectedSupplier(null);
    setView(target);
    closeAll();
  };

  const handleQuickAction = (target) => {
    setShowQuickAdd(false);
    setView(target);
  };

  return (
    <>
      {/* BOTTOM NAVIGATION BAR */}
      <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-40 pb-[env(safe-area-inset-bottom)] lg:left-72">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-stretch gap-0.5 px-1.5">
          <NavItem icon={Home} label="Home" active={view === 'home'} onClick={() => navigate('home')} />
          <NavItem icon={Users} label="Customers" active={view === 'customers' || view === 'profile'} onClick={() => navigate('customers')} />

          {/* 👇 CENTER "+" FLOATING BUTTON (Quick Transactions) */}
          <div className="grid place-items-center">
            <button
              onClick={() => { setShowMoreMenu(false); setShowQuickAdd(true); }}
              className="grid size-11 place-items-center rounded-2xl bg-indigo-600 text-white shadow-sm transition hover:bg-indigo-700 active:scale-95"
              aria-label="Quick actions"
            >
              <Plus size={26} strokeWidth={2.5} />
            </button>
          </div>

          <NavItem icon={Truck} label="Suppliers" active={view === 'suppliers' || view === 'supplierProfile'} onClick={() => navigate('suppliers')} />
          
          {/* 👇 "MORE" BUTTON (Opens Menu Sheet) */}
          <NavItem 
            icon={MoreHorizontal} 
            label="More" 
            active={showMoreMenu || view === 'settings' || view === 'products' || view === 'visibilityManager'} 
            onClick={() => { setShowQuickAdd(false); setShowMoreMenu(true); }} 
          />
        </div>
      </nav>

      {/* ➕ QUICK ACTION BOTTOM SHEET (Transactions) */}
      {showQuickAdd && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm lg:pl-72" onClick={() => setShowQuickAdd(false)}>
          <div
            role="dialog" aria-modal="true" aria-labelledby="quick-actions-heading"
            className="app-sheet app-safe-footer w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 id="quick-actions-heading" className="text-lg font-bold text-gray-900 dark:text-white">Quick actions</h3>
              <button aria-label="Close quick actions" onClick={() => setShowQuickAdd(false)} className="grid size-11 place-items-center rounded-full bg-gray-100 dark:bg-gray-800">
                <X size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-5">
              <QuickAction
                icon={ShoppingCart}
                label="Sell to Customer"
                color="green"
                onClick={() => handleQuickAction('record')}
              />
              <QuickAction
                icon={Truck}
                label="Buy from Supplier"
                color="indigo"
                onClick={() => handleQuickAction('recordSupplierPurchase')}
              />
              <QuickAction
                icon={Banknote}
                label="Receive Payment"
                color="blue"
                onClick={() => handleQuickAction('recordPayment')}
              />
              <QuickAction
                icon={DollarSign}
                label="Pay Supplier"
                color="orange"
                onClick={() => handleQuickAction('recordSupplierPayment')}
              />
            </div>

          </div>
        </div>
      )}

      {/* ⋯ MORE MENU BOTTOM SHEET */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm lg:pl-72" onClick={() => setShowMoreMenu(false)}>
          <div
            role="dialog" aria-modal="true" aria-labelledby="more-menu-heading"
            className="app-sheet app-safe-footer w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-gray-800">
              <h3 id="more-menu-heading" className="text-lg font-bold text-gray-900 dark:text-white">Menu</h3>
              <button aria-label="Close menu" onClick={() => setShowMoreMenu(false)} className="grid size-11 place-items-center rounded-full bg-gray-100 dark:bg-gray-800">
                <X size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <MenuButton
                icon={Crown}
                title={readOnly ? "Renew Subscription" : "Subscription"}
                subtitle={readOnly ? "Your plan expired — restore full access" : "View your plan, expiry and payment options"}
                iconBg={readOnly ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"}
                onClick={() => navigate('subscription')}
              />
              {/* Products */}
              <MenuButton
                icon={Package}
                title="Products"
                subtitle="Manage inventory & catalog"
                iconBg="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                onClick={() => navigate('products')}
              />

              {/* Settings */}
              <MenuButton
                icon={Settings}
                title="Settings"
                subtitle="Business name, currency & details"
                iconBg="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                onClick={() => navigate('settings')}
              />
            </div>

            <div className="h-4"></div>
          </div>
        </div>
      )}
    </>
  );
};
