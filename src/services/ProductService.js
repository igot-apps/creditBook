import { db } from '../database/db';

export const ProductService = {
  
  // 1. GET ALL (With Smart Lazy Migration)
  getAll: async (storeId) => {
    let products = await db.products.where('storeId').equals(storeId).toArray();
    
    let needsUpdate = false;
    const migratedProducts = products.map(p => {
      let updatedProduct = { ...p };
      
      // Lazy migration: if old 'price' exists but new fields don't
      if (updatedProduct.price !== undefined && updatedProduct.defaultSalePrice === undefined) {
        updatedProduct.defaultSalePrice = updatedProduct.price;
        updatedProduct.defaultPurchasePrice = updatedProduct.defaultPurchasePrice || 0;
        updatedProduct.isActive = updatedProduct.isActive !== undefined ? updatedProduct.isActive : true;
        updatedProduct.isFavourite = updatedProduct.isFavourite || false;
        delete updatedProduct.price; // Clean up the old field
        needsUpdate = true;
      } else {
        // Just ensure defaults exist for safety
        if (updatedProduct.isActive === undefined) updatedProduct.isActive = true;
        if (updatedProduct.isFavourite === undefined) updatedProduct.isFavourite = false;
        if (updatedProduct.defaultPurchasePrice === undefined) updatedProduct.defaultPurchasePrice = 0;
      }
      
      return updatedProduct;
    });

    // If we migrated any, save them back to the database silently in the background
    if (needsUpdate) {
      db.products.bulkPut(migratedProducts).catch(err => console.error("Product migration error:", err));
    }

    // Return only active products, sorted: Favorites first, then Alphabetical
    return products
      .filter(p => p.isActive !== false)
      .sort((a, b) => {
        if (a.isFavourite && !b.isFavourite) return -1;
        if (!a.isFavourite && b.isFavourite) return 1;
        return a.name.localeCompare(b.name);
      });
  },

  // 2. CREATE A NEW PRODUCT
  create: async (storeId, productData) => {
    const newProduct = {
      id: 'prod_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      storeId,
      name: productData.name.trim(),
      unit: productData.unit || 'Piece',
      defaultSalePrice: parseFloat(productData.defaultSalePrice) || 0,
      defaultPurchasePrice: parseFloat(productData.defaultPurchasePrice) || 0,
      isFavourite: productData.isFavourite || false,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    await db.products.add(newProduct);
    return newProduct.id;
  },

  // 3. UPDATE PRODUCT
  update: async (storeId, productId, updates) => {
    await db.products.update(productId, { 
      ...updates, 
      updatedAt: new Date().toISOString() 
    });
  },

  // 4. ARCHIVE PRODUCT (Soft Delete - No hard deletes!)
  archive: async (storeId, productId) => {
    await db.products.update(productId, { isActive: false });
  },

  // 5. TOGGLE FAVOURITE
  toggleFavourite: async (storeId, productId, currentStatus) => {
    await db.products.update(productId, { isFavourite: !currentStatus });
  },

  // 6. SEARCH (Fuzzy search for the catalog, favorites first)
  search: async (storeId, query) => {
    const q = query.toLowerCase();
    const allProducts = await db.products.where('storeId').equals(storeId).toArray();
    
    return allProducts
      .filter(p => p.isActive !== false && p.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (a.isFavourite && !b.isFavourite) return -1;
        if (!a.isFavourite && b.isFavourite) return 1;
        return a.name.localeCompare(b.name);
      });
  }
};