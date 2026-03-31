const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://tecnonacho.com";
const memoryCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

async function fetchRealProductPrice(sku) {
  if (!sku || sku === "N/D") return null;
  
  // Buscar en caché
  const cached = memoryCache.get(sku);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    const url = new URL("/wp-json/wc/store/v1/products", SITE_ORIGIN);
    url.searchParams.set("sku", sku);
    url.searchParams.set("per_page", "1");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "TecnoCotizador/1.0",
      },
      timeout: 3000, // Timeout de 3 segundos
    });

    if (!response.ok) return null;

    const products = await response.json();
    if (!Array.isArray(products) || products.length === 0) return null;

    const product = products[0];
    const priceData = product.prices;
    const rawPrice = priceData.price;
    const minorUnit = Number(priceData.currency_minor_unit || 0);
    const realPrice = Number(rawPrice) / Math.pow(10, minorUnit);

    // Guardar en caché
    memoryCache.set(sku, { 
      price: realPrice, 
      timestamp: Date.now() 
    });

    return realPrice;
  } catch (error) {
    console.error(`Error obteniendo precio para SKU ${sku}:`, error.message);
    return null; // No bloquear si hay error
  }
}

module.exports = { fetchRealProductPrice };