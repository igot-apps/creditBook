import { useApp } from "../contexts/AppContext";
import { formatCurrency } from "../utils/helpers";

export const CustomerCard = ({ customer, onClick }) => {
  const { setSelectedCustomer, setView } = useApp();
  
  const handleClick = () => {
    if (onClick) onClick(customer);
    else {
      setSelectedCustomer(customer);
      setView("profile");
    }
  };

  const balanceColor = customer.balance > 0 
    ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400" 
    : customer.balance < 0 
    ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
    : "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400";

  return (
    <div 
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${balanceColor}`}>
          {customer.name.charAt(0)}
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white">{customer.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold text-lg ${
          customer.balance > 0 ? "text-red-600 dark:text-red-400" : 
          customer.balance < 0 ? "text-blue-600 dark:text-blue-400" : 
          "text-green-600 dark:text-green-400"
        }`}>
          {customer.balance < 0 ? `Credit: ${formatCurrency(Math.abs(customer.balance))}` : formatCurrency(customer.balance)}
        </p>
        {customer.balance > 200 && (
          <span className="text-[10px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-bold">HIGH DEBT</span>
        )}
        {customer.balance < 0 && (
          <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">CREDIT</span>
        )}
      </div>
    </div>
  );
};