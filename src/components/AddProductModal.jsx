import { useState, useEffect } from "react";
import { X, Star, Package } from "lucide-react";
import useStore from "../store/useStore";
import { ProductService } from "../services/ProductService";

// Predefined units for fast entry
const UNITS = ["Piece", "Bag", "Box", "Bottle", "Pack", "Tin", "Crate", "Carton", "Kg", "Litre", "Other"];

export const AddProductModal = ({ product, onClose }) => {
  const { currentStore, showToast } = useStore();
  const isEditing = !!product;

  const [formData, setFormData] = useState({
    name: "",
    unit: "Piece",
    defaultSalePrice: "",
    defaultPurchasePrice: "",
    isFavourite: false
  });

  // Load data if editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        unit: product.unit || "Piece",
        defaultSalePrice: product.defaultSalePrice || "",
        defaultPurchasePrice: product.defaultPurchasePrice || "",
        isFavourite: product.isFavourite || false
      });
    }
  }, [product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("⚠️ Product name is required!");
      return;
    }

    try {
      if (isEditing) {
        await ProductService.update(currentStore.id, product.id, {
          name: formData.name.trim(),
          unit: formData.unit,
          defaultSalePrice: parseFloat(formData.defaultSalePrice) || 0,
          defaultPurchasePrice: parseFloat(formData.defaultPurchasePrice) || 0,
          isFavourite: formData.isFavourite
        });
        showToast("✅ Product updated!");
      } else {
        await ProductService.create(currentStore.id, {
          name: formData.name.trim(),
          unit: formData.unit,
          defaultSalePrice: parseFloat(formData.defaultSalePrice) || 0,
          defaultPurchasePrice: parseFloat(formData.defaultPurchasePrice) || 0,
          isFavourite: formData.isFavourite
        });
        showToast("✅ Product added to catalog!");
      }
      onClose();
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to save product.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package size={20} className="text-green-600" />
            {isEditing ? "Edit Product" : "Add New Product"}
          </h3>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <X size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Name */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Product Name *</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} 
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" 
              placeholder="e.g., Royal Rice"
              autoFocus={!isEditing}
            />
          </div>

          {/* Unit Dropdown */}
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Unit</label>
            <select 
              value={formData.unit} 
              onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))} 
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white appearance-none"
            >
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* Prices Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Default Selling Price</label>
              <input 
                type="number" 
                inputMode="decimal"
                value={formData.defaultSalePrice} 
                onChange={(e) => setFormData(prev => ({ ...prev, defaultSalePrice: e.target.value }))} 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" 
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block">Default Buying Price</label>
              <input 
                type="number" 
                inputMode="decimal"
                value={formData.defaultPurchasePrice} 
                onChange={(e) => setFormData(prev => ({ ...prev, defaultPurchasePrice: e.target.value }))} 
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 dark:text-white" 
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Favourite Toggle */}
          <div 
            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer" 
            onClick={() => setFormData(prev => ({ ...prev, isFavourite: !prev.isFavourite }))}
          >
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${formData.isFavourite ? 'bg-yellow-400 border-yellow-400' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}>
              {formData.isFavourite && <Star size={14} className="text-white fill-white" />}
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Mark as Favourite (Shows first in search)</span>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition shadow-lg mt-2"
          >
            {isEditing ? "Update Product" : "Add to Catalog"}
          </button>
        </form>
      </div>
    </div>
  );
};