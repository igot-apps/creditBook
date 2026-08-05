import { useState, useEffect, useMemo, useRef } from "react";
import useStore from "../store/useStore";
import { SupplierService } from "../services/SupplierService";
import { ProductService } from "../services/ProductService";
import { TopBar } from "../components/TopBar";

// Import components
import { ProgressStepper } from "../components/supplier/ProgressStepper";
import { UndoBanner } from "../components/supplier/UndoBanner";
import { SupplierSelection } from "../components/supplier/SupplierSelection";
import { SelectedSupplierCard } from "../components/supplier/SelectedSupplierCard";
import { ProductSearchSection } from "../components/supplier/ProductSearchSection";
import { InvoiceItemsList } from "../components/supplier/InvoiceItemsList";
import { FinancialSummaryCard } from "../components/supplier/FinancialSummaryCard";
import { CreateProductModal } from "../components/supplier/CreateProductModal";

export const RecordPurchasePage = () => {
  const { currentStore, setView, prefillTransaction, setPrefillTransaction, showToast } = useStore();
  const currency = currentStore?.currency || "GH₵";

  // Core state
  const [mode, setMode] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [note, setNote] = useState("");
  const [amountPaid, setAmountPaid] = useState("");

  // New UX state
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", unit: "", defaultPurchasePrice: "", defaultSalePrice: "" });
  const [lastSavedTx, setLastSavedTx] = useState(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);
  const undoTimerRef = useRef(null);

  // Load data
  useEffect(() => {
    if (currentStore?.id) {
      SupplierService.getAll(currentStore.id)
        .then(res => setSuppliers(Array.isArray(res) ? res : []))
        .catch(() => setSuppliers([]));
      ProductService.getAll(currentStore.id)
        .then(res => setProducts(Array.isArray(res) ? res : []))
        .catch(() => setProducts([]));
    }
  }, [currentStore?.id]);

  // Handle prefill
  useEffect(() => {
    if (prefillTransaction && prefillTransaction.supplierId) {
      const supplier = (Array.isArray(suppliers) ? suppliers : []).find(s => s.id === prefillTransaction.supplierId) || {
        id: prefillTransaction.supplierId,
        name: prefillTransaction.name || "Unknown Supplier",
        phone: prefillTransaction.phone || "",
        balance: 0,
        history: []
      };
      setSelectedSupplier(supplier);
      setMode("existing");
      if (prefillTransaction.paid !== undefined && prefillTransaction.paid !== "") {
        setAmountPaid(prefillTransaction.paid.toString());
      }
      setPrefillTransaction(null);
    }
  }, [prefillTransaction, suppliers, setPrefillTransaction]);

  // Cleanup undo timer
  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  // Derived data
  const filteredSuppliers = useMemo(() => {
    if (!Array.isArray(suppliers)) return [];
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q)));
  }, [suppliers, searchQuery]);

  const favoriteProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter(p => p.isFavourite).slice(0, 8);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [productSearch, products]);

  // Progress step
  const currentStep = !selectedSupplier ? 1 : invoiceItems.length === 0 ? 2 : 3;

  // Totals
  const totalAmount = invoiceItems.reduce((sum, item) => {
    if (item.total !== undefined && item.total !== "") return sum + (parseFloat(item.total) || 0);
    const qty = item.quantity === "" ? 0 : (parseFloat(item.quantity) || 0);
    const price = item.price === "" ? 0 : (parseFloat(item.price) || 0);
    return sum + (qty * price);
  }, 0);

  // Handlers
  const handleSelectSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setMode("existing");
    setSearchQuery("");
  };

  const handleCreateSupplier = () => {
    const name = searchQuery.trim();
    if (name) {
      SupplierService.addSupplier(currentStore.id, name, "")
        .then(id => {
          const newSupplier = { id, name, phone: "", balance: 0, history: [] };
          setSelectedSupplier(newSupplier);
          setMode("existing");
          setSearchQuery("");
          showToast("✅ Supplier created!");
          SupplierService.getAll(currentStore.id).then(setSuppliers);
        })
        .catch(() => showToast("❌ Failed to create supplier."));
    }
  };

  const addProductToInvoice = (product) => {
    const existing = invoiceItems.find(i => i.productId === product.id);
    const startingPrice = product.defaultPurchasePrice || 0;
    if (existing) {
      setInvoiceItems(invoiceItems.map(i =>
        i.productId === product.id ? {
          ...i,
          quantity: (i.quantity || 1) + 1,
          total: ((i.quantity || 1) + 1) * i.price
        } : i
      ));
    } else {
      setInvoiceItems([...invoiceItems, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        price: startingPrice,
        total: startingPrice,
        unit: product.unit || "Piece"
      }]);
    }
    setProductSearch("");
  };

  const updateItem = (index, field, value) => {
    const updated = [...invoiceItems];
    const numValue = value === "" ? "" : parseFloat(value);
    const isValidNum = numValue !== "" && !isNaN(numValue);

    if (field === 'quantity') {
      updated[index].quantity = numValue;
      const price = parseFloat(updated[index].price) || 0;
      updated[index].total = isValidNum ? (numValue * price) : "";
    } else if (field === 'price') {
      updated[index].price = numValue;
      const qty = parseFloat(updated[index].quantity) || 0;
      updated[index].total = isValidNum ? (qty * numValue) : "";
    } else if (field === 'total') {
      updated[index].total = numValue;
      const price = parseFloat(updated[index].price) || 0;
      if (price > 0 && isValidNum) {
        updated[index].quantity = numValue / price;
      } else {
        updated[index].quantity = "";
      }
    }
    setInvoiceItems(updated);
  };

  const setQuickQty = (index, qty) => {
    const updated = [...invoiceItems];
    updated[index].quantity = qty;
    const price = parseFloat(updated[index].price) || 0;
    updated[index].total = qty * price;
    setInvoiceItems(updated);
  };

  const removeItem = (index) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  const handleSavePurchase = async () => {
    if (!selectedSupplier) return;
    const finalPaid = parseFloat(amountPaid) || 0;
    const finalTotal = totalAmount;

    if (finalTotal === 0 && finalPaid === 0 && !note.trim()) {
      showToast("⚠️ Please add items, a payment amount, or a note.");
      return;
    }

    try {
      const itemsArray = invoiceItems.map(i => ({
        name: i.name,
        quantity: i.quantity || 1,
        unit: i.unit || "Piece",
        price: i.price || 0,
        total: i.total !== "" && i.total !== undefined
          ? (parseFloat(i.total) || 0)
          : ((i.quantity || 1) * (i.price || 0))
      }));

      const result = await SupplierService.addTransaction(
        currentStore.id,
        selectedSupplier.id,
        finalTotal,
        finalPaid,
        itemsArray,
        note
      );

      setLastSavedTx({
        id: result.transactionId,
        supplierId: selectedSupplier.id,
        amount: finalTotal,
        paid: finalPaid
      });
      setShowUndoBanner(true);

      setInvoiceItems([]);
      setAmountPaid("");
      setNote("");

      undoTimerRef.current = setTimeout(() => {
        setShowUndoBanner(false);
        setLastSavedTx(null);
        setView("suppliers");
      }, 5000);

    } catch (error) {
      console.error(error);
      showToast("❌ Failed to record transaction.");
    }
  };

  const handleUndo = async () => {
    if (!lastSavedTx) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    try {
      await SupplierService.voidTransaction(
        currentStore.id,
        lastSavedTx.supplierId,
        lastSavedTx.id,
        "Undone by user"
      );
      setShowUndoBanner(false);
      setLastSavedTx(null);
      showToast("✅ Purchase undone");
      setView("suppliers");
    } catch (error) {
      showToast("❌ Failed to undo");
    }
  };

  const handleDismissUndo = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setShowUndoBanner(false);
    setLastSavedTx(null);
    setView("suppliers");
  };

  const handleSaveNewProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.defaultPurchasePrice) {
      showToast("⚠️ Name and buying price are required");
      return;
    }
    try {
      const productData = {
        name: newProduct.name.trim(),
        defaultPurchasePrice: parseFloat(newProduct.defaultPurchasePrice) || 0,
        defaultSalePrice: parseFloat(newProduct.defaultSalePrice) || 0,
        unit: newProduct.unit.trim() || "Piece",
        isFavourite: false
      };
      const newId = await ProductService.create(currentStore.id, productData);
      const createdProduct = { id: newId, ...productData };
      setProducts(prev => [...prev, createdProduct]);
      addProductToInvoice(createdProduct);
      setShowCreateProduct(false);
      setNewProduct({ name: "", unit: "", defaultPurchasePrice: "", defaultSalePrice: "" });
      showToast("✅ Product created & added!");
    } catch (error) {
      showToast("❌ Failed to create product");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <TopBar title="Record Supplier Purchase" showBack={true} onBack={() => setView("suppliers")} />

      <div style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4.5rem)' }} className="p-4 max-w-lg mx-auto space-y-4">

        {/* Undo Banner */}
        {showUndoBanner && (
          <UndoBanner 
            transaction={lastSavedTx} 
            currency={currency} 
            onUndo={handleUndo} 
            onDismiss={handleDismissUndo} 
          />
        )}

        {/* Progress Stepper */}
        {mode === "existing" && <ProgressStepper currentStep={currentStep} />}

        {/* Supplier Selection */}
        {mode === "search" && (
          <SupplierSelection
            suppliers={filteredSuppliers}
            searchQuery={searchQuery}
            onSearchChange={e => setSearchQuery(e.target.value)}
            onSelectSupplier={handleSelectSupplier}
            onCreateSupplier={handleCreateSupplier}
          />
        )}

        {/* Selected Supplier Card */}
        {mode === "existing" && selectedSupplier && (
          <SelectedSupplierCard 
            supplier={selectedSupplier} 
            onChange={() => { 
              setMode("search"); 
              setSelectedSupplier(null); 
              setAmountPaid(""); 
              setInvoiceItems([]); 
            }} 
          />
        )}

        {/* Items Section */}
        {mode === "existing" && (
          <>
            <ProductSearchSection
              productSearch={productSearch}
              onProductSearchChange={e => setProductSearch(e.target.value)}
              favoriteProducts={favoriteProducts}
              filteredProducts={filteredProducts}
              onAddProduct={addProductToInvoice}
              onCreateProduct={(name) => {
                setNewProduct({ ...newProduct, name });
                setShowCreateProduct(true);
              }}
            />

            <InvoiceItemsList
              items={invoiceItems}
              onUpdateItem={updateItem}
              onRemoveItem={removeItem}
              onSetQuickQty={setQuickQty}
            />

            {/* Financial Summary */}
            {(invoiceItems.length > 0 || amountPaid !== "") && (
              <FinancialSummaryCard
                totalAmount={totalAmount}
                amountPaid={amountPaid}
                onAmountPaidChange={e => setAmountPaid(e.target.value)}
                note={note}
                onNoteChange={e => setNote(e.target.value)}
                onSave={handleSavePurchase}
                itemCount={invoiceItems.length}
                currency={currency}
              />
            )}
          </>
        )}
      </div>

      {/* Create Product Modal */}
      {showCreateProduct && (
        <CreateProductModal
          product={newProduct}
          onChange={setNewProduct}
          onSave={handleSaveNewProduct}
          onClose={() => setShowCreateProduct(false)}
        />
      )}
    </div>
  );
};