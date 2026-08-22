import { Phone, Edit3, Clock } from "lucide-react";

export const CustomerHeader = ({ customer, daysSinceLastActive, onEdit }) => (
  <div className="flex items-center gap-4">
    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0">
      {(customer.name || "?").charAt(0)}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{customer.name || "Unknown"}</h2>
        <button onClick={onEdit} className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition" title="Edit Customer">
          <Edit3 size={14} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
        <Phone size={12} /> {customer.phone || "No phone"}
      </p>
      {daysSinceLastActive && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
          <Clock size={10} /> Last active: {daysSinceLastActive}
        </p>
      )}
    </div>
  </div>
);