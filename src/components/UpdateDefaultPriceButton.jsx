import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { ProductService } from "../services/ProductService";
import { formatCurrency } from "../utils/helpers";

export function UpdateDefaultPriceButton({ item, products, setProducts, storeId, priceType, currency, showToast }) {
  const [saving, setSaving] = useState(false);
  const product = products.find(entry => entry.id === item.productId);
  const unit = product?.units?.find(entry => entry.name?.trim().toLowerCase() === item.unitName?.trim().toLowerCase());
  const price = Number(item.price);
  const defaultPrice = Number(priceType === "purchase" ? unit?.defaultPurchasePrice : unit?.defaultSalePrice);

  if (!product || !unit || !(price > 0) || Math.abs(price - defaultPrice) < 0.005) return null;

  async function saveDefaultPrice() {
    if (saving) return;
    setSaving(true);
    try {
      const units = await ProductService.updateUnitPrice(storeId, product.id, unit.name, priceType, price);
      setProducts(list => list.map(entry => entry.id === product.id ? { ...entry, units } : entry));
      showToast(`Default ${priceType} price updated to ${formatCurrency(price, currency)}`);
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : "Could not update the default price.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      disabled={saving}
      onClick={saveDefaultPrice}
      className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 text-xs font-semibold text-purple-800 transition hover:bg-purple-100 disabled:opacity-60 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-200 dark:hover:bg-purple-900/40"
    >
      <RefreshCw size={14} className={saving ? "animate-spin" : ""} />
      {saving ? "Updating…" : `Use ${formatCurrency(price, currency)} as default for ${item.unitName}`}
    </button>
  );
}
