import { formatCurrency } from "../../utils/helpers";

export const TransactionItemsList = ({ items, currency = "GH₵", isVoid = false }) => {
  
  let parsedItems = [];
  let isStructured = false;

  if (!items) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Description</p>
        <p className={`text-sm text-gray-400 dark:text-gray-500 italic ${isVoid ? 'line-through opacity-60' : ''}`}>
          No items recorded
        </p>
      </div>
    );
  }

  if (Array.isArray(items)) {
    parsedItems = items;
    isStructured = true;
  } 
  else if (typeof items === 'string' && items.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(items);
      if (Array.isArray(parsed)) {
        parsedItems = parsed;
        isStructured = true;
      }
    } catch (e) {}
  }
  
  if (!isStructured && typeof items === 'string') {
    const parts = items.split(',').map(p => p.trim()).filter(Boolean);
    parsedItems = parts.map(part => {
      const match = part.match(/^(\d+(?:\.\d+)?)\s+(.+?)\s+(.+)$/);
      if (match) {
        return {
          quantity: parseFloat(match[1]),
          unit: match[2],
          name: match[3],
          price: null,
          total: null
        };
      }
      return { quantity: 1, unit: "", name: part, price: null, total: null };
    });
  }

  if (isStructured || parsedItems.length > 0) {
    const hasPrices = parsedItems.some(item => item.price !== null && item.price !== undefined);
    
    return (
      <div className="space-y-3">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1">
          Items {hasPrices ? "Purchased" : "Recorded"} ({parsedItems.length})
        </p>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {hasPrices && (
            <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <div className="col-span-5">Item</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-3 text-right">Total</div>
            </div>
          )}
          
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {parsedItems.map((item, idx) => (
              <div 
                key={idx} 
                className={`px-4 py-3 ${isVoid ? 'opacity-60' : ''}`}
              >
                {hasPrices ? (
                  <>
                    {/* Mobile Layout (Stacked to prevent overlap) */}
                    <div className="sm:hidden space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className={`font-semibold text-sm text-gray-900 dark:text-white truncate ${isVoid ? 'line-through' : ''}`}>
                            {item.name}
                          </p>
                          {item.unit && (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                              per {item.unit}
                            </p>
                          )}
                        </div>
                        <p className={`text-base font-bold flex-shrink-0 ${isVoid ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                          {formatCurrency(item.total || 0, currency)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 dark:text-gray-400">Qty:</span>
                          <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded font-bold">
                            {item.quantity || 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 dark:text-gray-400">Price:</span>
                          <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {formatCurrency(item.price || 0, currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout (Table) */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 items-center">
                      <div className="col-span-5 min-w-0">
                        <p className={`font-semibold text-sm text-gray-900 dark:text-white truncate ${isVoid ? 'line-through' : ''}`}>
                          {item.name}
                        </p>
                        {item.unit && (
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            per {item.unit}
                          </p>
                        )}
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-bold">
                          {item.quantity || 1}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                          {formatCurrency(item.price || 0, currency)}
                        </span>
                      </div>
                      <div className="col-span-3 text-right">
                        <span className={`text-sm font-bold ${isVoid ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                          {formatCurrency(item.total || 0, currency)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="inline-block px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-bold flex-shrink-0">
                        {item.quantity || 1} {item.unit}
                      </span>
                      <p className={`font-semibold text-sm text-gray-900 dark:text-white truncate ${isVoid ? 'line-through' : ''}`}>
                        {item.name}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
      <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Description</p>
      <p className={`text-sm text-gray-900 dark:text-white ${isVoid ? 'line-through opacity-60' : ''}`}>
        {items}
      </p>
    </div>
  );
};