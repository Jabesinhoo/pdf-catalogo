const pool = require('../config/db'); // ✅ SOLO ESTO

// Función para extraer el valor numérico del precio
function extractPriceValue(priceStr) {
  if (!priceStr) return 0;
  
  let text = String(priceStr).trim();
  text = text.replace(/[^\d,.-]/g, '');
  
  const dotCount = (text.match(/\./g) || []).length;
  const commaCount = (text.match(/,/g) || []).length;
  
  if (dotCount > 0 && commaCount > 0) {
    const lastDot = text.lastIndexOf('.');
    const lastComma = text.lastIndexOf(',');
    
    if (lastComma > lastDot) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (dotCount > 0) {
    const parts = text.split('.');
    const last = parts[parts.length - 1];
    
    if (parts.length > 2 || (last && last.length === 3)) {
      text = parts.join('');
    }
  } else if (commaCount > 0) {
    const parts = text.split(',');
    const last = parts[parts.length - 1];
    
    if (parts.length > 2 || (last && last.length === 3)) {
      text = parts.join('');
    } else {
      text = text.replace(',', '.');
    }
  }
  
  const number = parseFloat(text);
  return isNaN(number) ? 0 : number;
}

// Limpiar producto
function sanitizeProductForCache(product) {
  return {
    id: product.id,
    name: product.name || '',
    sku: product.sku || '',
    price: product.price || '',
    price_numeric: extractPriceValue(product.price),
    shortDescription: product.shortDescription || '',
    image: product.image || '',
    productUrl: product.productUrl || '',
    quantity: product.quantity || 1,
    ivaRate: product.ivaRate || 0,
    ivaType: product.ivaType || 'gravado',
    totalPrice: product.totalPrice || '',
    selected: product.selected ?? true,
    images: product.images || []
  };
}

// Guardar productos en caché
async function cacheProducts(products) {
  if (!products || products.length === 0) return;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const product of products) {
      const sanitized = sanitizeProductForCache(product);
      const productData = JSON.stringify(sanitized);
      
      await client.query(`
        INSERT INTO product_cache (sku, product_data, price_numeric, product_name, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (sku) DO UPDATE SET 
          product_data = EXCLUDED.product_data,
          price_numeric = EXCLUDED.price_numeric,
          product_name = EXCLUDED.product_name,
          updated_at = NOW()
      `, [sanitized.sku, productData, sanitized.price_numeric, sanitized.name]);
    }
    
    await client.query('COMMIT');
    console.log(`✅ ${products.length} productos guardados en caché`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error cacheando productos:', error);
  } finally {
    client.release();
  }
}

// Obtener producto cacheado
async function getCachedProduct(sku) {
  if (!sku) return null;
  
  const result = await pool.query(`
    SELECT product_data FROM product_cache 
    WHERE sku = $1 AND updated_at > NOW() - INTERVAL '30 days'
  `, [sku]);
  
  return result.rows.length > 0 ? result.rows[0].product_data : null;
}

// Buscar productos
async function searchCachedProducts(searchTerm) {
  if (!searchTerm) return [];
  
  const result = await pool.query(`
    SELECT product_data FROM product_cache 
    WHERE product_name ILIKE $1 OR sku ILIKE $1
    ORDER BY updated_at DESC
    LIMIT 100
  `, [`%${searchTerm}%`]);
  
  return result.rows.map(row => row.product_data);
}

// Obtener todos
async function getAllCachedProducts() {
  const result = await pool.query(`
    SELECT product_data FROM product_cache 
    ORDER BY updated_at DESC
  `);
  
  return result.rows.map(row => row.product_data);
}

module.exports = { 
  cacheProducts, 
  getCachedProduct, 
  searchCachedProducts,
  getAllCachedProducts
};