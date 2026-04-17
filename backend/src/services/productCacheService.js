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
async function cacheProducts() {
  return;
}

async function getCachedProduct() {
  return null;
}

async function searchCachedProducts() {
  return [];
}

async function getAllCachedProducts() {
  return [];
}

module.exports = {
  cacheProducts,
  getCachedProduct,
  searchCachedProducts,
  getAllCachedProducts,
};