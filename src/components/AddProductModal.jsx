import { useState, useEffect } from "react";
import { X, Plus, Trash2 } from "lucide-react";

const noSpinnerClass = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export const AddProductModal = ({ isOpen, onClose, onSave, initialName, editProduct }) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [units, setUnits] = useState([
    { id: Date.now().toString(), name: "", defaultPurchasePrice: "", defaultSalePrice: "" }
  ]);

  // Smart initialization: Edit mode vs Create mode
  useEffect(() => {
    if (isOpen) {
      if (editProduct) {
        // EDIT MODE: Populate with existing data
        setName(editProduct.name || "");
        setCategory(editProduct.category || "");
        setBrand(editProduct.brand || "");
        setUnits(editProduct.units && editProduct.units.length > 0 ? editProduct.units : [{ id: Date.now().toString(), name: "", defaultPurchasePrice: "", defaultSalePrice: "" }]);
      } else {
        // CREATE MODE: Reset form (or use initialName from search)
        setName(initialName || "");
        setCategory("");
        setBrand("");
        setUnits([{ id: Date.now().toString(), name: "", defaultPurchasePrice: "", defaultSalePrice: "" }]);
      }
    }
  }, [isOpen, editProduct, initialName]);

  if (!isOpen) return null;

  const addUnit = () => {
    setUnits([...units, { id: Date.now().toString(), name: "", defaultPurchasePrice: "", defaultSalePrice: "" }]);
  };

  const removeUnit = (id) => {
    if (units.length > 1) {
      setUnits(units.filter(u => u.id !== id));
    }
  };

  const updateUnit = (id, field, value) => {
    setUnits(units.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert("Product name is required");
      return;
    }
    
    const validUnits = units.filter(u => u.name.trim());
    if (validUnits.length === 0) {
      alert("At least one unit name is required");
      return;
    }

    const formattedUnits = validUnits.map(u => ({
      id: u.id,
      name: u.name.trim(),
      defaultPurchasePrice: parseFloat(u.defaultPurchasePrice) || 0,
      defaultSalePrice: parseFloat(u.defaultSalePrice) || 0
    }));

    // 👇 UPDATED: No longer passing visibility. 
    // ProductService will automatically default new products to visible everywhere.
    onSave({
      id: editProduct ? editProduct.id : undefined,
      name: name.trim(),
      category: category.trim(),
      brand: brand.trim(),
      units: formattedUnits
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center z-10">
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">
            {editProduct ? "Edit Product Template" : "Create Product Template"}
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <X size={18} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Product Name */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Product Name *</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g., Royal Rice, Coca-Cola" 
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
              autoFocus
            />
          </div>

          {/* Category & Brand (Optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Category (Optional)</label>
              <input 
                value={category} 
                onChange={e => setCategory(e.target.value)} 
                placeholder="e.g., Rice, Drinks" 
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Brand (Optional)</label>
              <input 
                value={brand} 
                onChange={e => setBrand(e.target.value)} 
                placeholder="e.g., Royal, Nestle" 
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white text-sm"
              />
            </div>
          </div>

          {/* Units Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Pricing Units</label>
              <button onClick={addUnit} className="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1 hover:underline">
                <Plus size={14} /> Add Unit
              </button>
            </div>
            
            <div className="space-y-3">
              {units.map((unit, index) => (
                <div key={unit.id} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                      {index === 0 ? "Primary Unit" : `Unit ${index + 1}`}
                    </span>
                    {units.length > 1 && (
                      <button onClick={() => removeUnit(unit.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  
                  <input 
                    value={unit.name} 
                    onChange={e => updateUnit(unit.id, 'name', e.target.value)} 
                    placeholder="Unit Name (e.g., Carton, Kg, Bottle)" 
                    className="w-full px-2 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                  />
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Buying Price</label>
                      <input 
                        type="number" step="0.01"
                        value={unit.defaultPurchasePrice} 
                        onChange={e => updateUnit(unit.id, 'defaultPurchasePrice', e.target.value)} 
                        placeholder="0.00" 
                        className={`w-full px-2 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white ${noSpinnerClass}`}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">Selling Price</label>
                      <input 
                        type="number" step="0.01"
                        value={unit.defaultSalePrice} 
                        onChange={e => updateUnit(unit.id, 'defaultSalePrice', e.target.value)} 
                        placeholder="0.00" 
                        className={`w-full px-2 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white ${noSpinnerClass}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={handleSave}
            className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg mt-2 ${
              editProduct 
                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {editProduct ? "Update Product" : "Save Product Template"}
          </button>
        </div>
      </div>
    </div>
  );
};