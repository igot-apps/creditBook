import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/helpers";

export const MoreInformation = ({ totalSales, totalPayments, historyLength, createdAt, currency }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <button onClick={() => setShow(!show)} className="w-full p-4 flex justify-between items-center text-sm font-bold text-gray-700 dark:text-gray-300">
        More Information <ChevronDown size={16} className={`transition-transform ${show ? 'rotate-180' : ''}`} />
      </button>
      {show && (
        <div className="p-4 pt-0 grid grid-cols-2 gap-3">
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Total Sales</p><p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalSales, currency)}</p></div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Total Paid</p><p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPayments, currency)}</p></div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Transactions</p><p className="text-lg font-bold text-gray-900 dark:text-white">{historyLength}</p></div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p className="text-[10px] text-gray-500 uppercase font-bold">Customer Since</p><p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{createdAt ? formatDate(createdAt).split(',')[0] : 'N/A'}</p></div>
        </div>
      )}
    </div>
  );
};