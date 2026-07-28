import { ChevronRight } from "lucide-react";
import useStore from "../store/useStore";
import { formatCurrency, formatDate } from "../utils/helpers";

export const CustomerCard = ({ customer }) => {
  const { setView, setSelectedCustomer } = useStore();

  const handleViewProfile = () => {
    setSelectedCustomer(customer);
    setView("profile");
  };

  // Get the date of the last transaction
  const lastActivity = customer.history && customer.history.length > 0 
    ? formatDate(customer.history[customer.history.length - 1].date).split(',')[0] 
    : 'No activity';

  return (
    <div 
      onClick={handleViewProfile}
      className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 active:scale-[0.98] transition-transform cursor-pointer"
    >
      {/* Avatar */}
      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">
        {customer.name.charAt(0)}
      </div>
      
      {/* Name & Phone */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 dark:text-white truncate">{customer.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{customer.phone}</p>
      </div>

      {/* Balance & Date */}
      <div className="text-right flex-shrink-0 mr-2">
        <p className={`font-bold text-lg ${
          customer.balance > 0 ? "text-red-600 dark:text-red-400" : 
          customer.balance < 0 ? "text-blue-600 dark:text-blue-400" : 
          "text-green-600 dark:text-green-400"
        }`}>
          {customer.balance < 0 
            ? `Credit: ${formatCurrency(Math.abs(customer.balance))}` 
            : formatCurrency(customer.balance)}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{lastActivity}</p>
      </div>

      {/* Arrow Icon */}
      <ChevronRight className="text-gray-300 dark:text-gray-600 flex-shrink-0" size={20} />
    </div>
  );
};