export function matchesProductSearch(product, query, units = product.units) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const productFields = [product.name, product.category, product.brand].filter(Boolean);
  const matches = fields => {
    const text = fields.join(" ").toLowerCase();
    return terms.every(term => text.includes(term));
  };

  return matches(productFields) || units?.some(unit => matches([...productFields, unit.name])) || false;
}
