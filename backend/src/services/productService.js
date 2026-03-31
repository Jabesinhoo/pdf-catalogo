const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://tecnonacho.com";

const CACHE_TTL_MS = 60 * 1000;
const memoryCache = new Map();
const { getCachedProduct, cacheProducts, searchCachedProducts } = require('./productCacheService');

const https = require('https');
const http = require('http');

// Crear agent con timeout y keepAlive
const agent = new https.Agent({
  keepAlive: true,
  timeout: 10000,
});

function cleanText(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

function stripHtml(html = "") {
  return cleanText(String(html).replace(/<[^>]*>/g, " "));
}

function formatPrice(prices = {}) {
  const raw = prices.price ?? "";
  const minorUnit = Number(prices.currency_minor_unit ?? 0);

  if (raw === "") return "No disponible";

  const amount = Number(raw) / Math.pow(10, minorUnit);

  const formatted = new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: minorUnit,
    maximumFractionDigits: minorUnit,
  }).format(amount);

  return `${prices.currency_prefix || prices.currency_symbol || ""}${formatted}${prices.currency_suffix || ""}`.trim();
}

function normalizeCategoryValues(categories = []) {
  if (!Array.isArray(categories)) return [];
  return categories.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeStockStatuses(stockStatuses = []) {
  const allowed = new Set(["instock", "outofstock", "onbackorder"]);
  if (!Array.isArray(stockStatuses)) return [];
  return stockStatuses
    .map((item) => String(item || "").trim().toLowerCase())
    .filter((item) => allowed.has(item));
}

function getCategorySlugFromUrl(inputUrl) {
  const url = new URL(inputUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  const categoryIndex = parts.indexOf("categoria-producto");

  if (categoryIndex === -1) {
    throw new Error("Debes enviar una URL de categoría de Tecnonacho.");
  }

  const slug = parts[parts.length - 1];
  if (!slug || slug === "categoria-producto") {
    throw new Error("No pude obtener el slug de la categoría desde la URL.");
  }

  return slug;
}

function normalizeSearchTerm(term) {
  if (!term) return "";
  
  return String(term)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function buildProductsEndpoint({ mode, value, page, categories = [], stockStatuses = [] }) {
  const baseUrl = new URL("/wp-json/wc/store/v1/products", SITE_ORIGIN);
  const params = baseUrl.searchParams;

  params.set("page", String(page));
  params.set("per_page", "100");

  const normalizedCategories = normalizeCategoryValues(categories);
  const normalizedStockStatuses = normalizeStockStatuses(stockStatuses);

  if (normalizedCategories.length > 0) {
    params.set("category", normalizedCategories.join(","));
  } else if (mode === "url" && value) {
    params.set("category", getCategorySlugFromUrl(value));
  }

  if (mode === "name" && value) {
    const normalizedValue = normalizeSearchTerm(value);
    params.set("search", normalizedValue);
  }

  if (mode === "sku" && value) {
    params.set("sku", value);
  }

  normalizedStockStatuses.forEach((status, index) => {
    params.append(`stock_status[${index}]`, status);
  });

  return baseUrl.toString();
}

async function fetchJson(url, retries = 2) {
  const cached = memoryCache.get(url);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.data;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const rawText = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error("Invalid JSON");
      }

      memoryCache.set(url, { data, createdAt: Date.now() });
      return data;
    } catch (error) {
      console.warn(`⚠️ Intento ${attempt}/${retries} falló:`, error.message);
      if (attempt === retries) {
        throw new Error(`fetch failed: ${error.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// 👇 FUNCIÓN MODIFICADA CON STOCK
function normalizeProduct(item) {
  // Determinar el stock usando los campos correctos
  let stockDisplay = 'Sin stock';
  let stockStatus = 'outofstock';
  let stockQuantity = null;
  
  // Usar is_in_stock (true/false)
  if (item.is_in_stock === true) {
    stockStatus = 'instock';
    // Usar low_stock_remaining si existe
    if (item.low_stock_remaining !== undefined && item.low_stock_remaining !== null) {
      stockQuantity = item.low_stock_remaining;
      stockDisplay = `${item.low_stock_remaining} unidades`;
    } else {
      stockDisplay = 'En stock';
    }
  } else if (item.is_on_backorder === true) {
    stockStatus = 'onbackorder';
    stockDisplay = 'Sobre pedido';
  } else {
    stockStatus = 'outofstock';
    stockDisplay = 'Sin stock';
  }
  
  // También podemos usar stock_availability.text si existe
  if (item.stock_availability?.text) {
    stockDisplay = item.stock_availability.text;
  }

  console.log(`📦 Producto: ${item.name} | Stock: ${stockDisplay}`);

  return {
    id: String(item.id),
    name: item.name || "Sin nombre",
    sku: item.sku || "N/D",
    shortDescription: stripHtml(item.short_description || item.summary || ""),
    price: formatPrice(item.prices),
    image: item.images?.[0]?.src || item.images?.[0]?.thumbnail || "",
    productUrl: item.permalink || "",
    quantity: 1,
    ivaRate: 0,
    totalPrice: "",
    selected: true,
    stockStatus: stockStatus,
    stockQuantity: stockQuantity,
    stockDisplay: stockDisplay,
  };
}

function normalizeCategory(item) {
  return {
    id: String(item.id),
    name: item.name || "Sin nombre",
    slug: item.slug || "",
    parent: item.parent ? String(item.parent) : "",
    count: Number(item.count || 0),
    permalink: item.permalink || "",
    image: item.image?.thumbnail || item.image?.src || "",
  };
}

async function fetchProducts({ mode, value, categories = [], stockStatuses = [] }) {
  const all = [];
  const seen = new Set();
  let retries = 2;

  const attemptFetch = async () => {
    for (let page = 1; page <= 200; page += 1) {
      const endpoint = buildProductsEndpoint({
        mode,
        value,
        page,
        categories,
        stockStatuses,
      });

      try {
        const batch = await fetchJson(endpoint);

        if (!Array.isArray(batch) || batch.length === 0) break;

        for (const item of batch) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          all.push(normalizeProduct(item));
        }

        if (batch.length < 100) break;
      } catch (error) {
        console.error(`❌ Error en página ${page}:`, error.message);
        throw error;
      }
    }
    return all;
  };

  try {
    const result = await attemptFetch();
    
    // Guardar en caché local para uso offline
    if (result.length > 0) {
      await cacheProducts(result);
    }
    
    return result;
  } catch (error) {
    console.warn('⚠️ API externa falló, usando caché local:', error.message);
    
    // Usar caché local
    if (mode === 'sku' && value) {
      const cached = await getCachedProduct(value);
      return cached ? [cached] : [];
    }
    
    if (mode === 'name' && value) {
      return await searchCachedProducts(value);
    }
    
    if (mode === 'url' && value) {
      // Para URL, intentar buscar por nombre de categoría
      const categoryName = value.split('/').pop().replace(/-/g, ' ');
      return await searchCachedProducts(categoryName);
    }
    
    return [];
  }
}

async function fetchCategories() {
  const all = [];
  const seen = new Set();
  const perPage = 100;

  for (let page = 1; page <= 50; page += 1) {
    const url = new URL("/wp-json/wc/store/v1/products/categories", SITE_ORIGIN);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    url.searchParams.set("hide_empty", "false");

    const batch = await fetchJson(url.toString());

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    for (const item of batch) {
      const normalized = normalizeCategory(item);

      if (!normalized.id || seen.has(normalized.id)) continue;

      seen.add(normalized.id);
      all.push(normalized);
    }

    if (batch.length < perPage) {
      break;
    }
  }

  return all.sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "es", {
      sensitivity: "base",
    })
  );
}

module.exports = {
  fetchProducts,
  fetchCategories,
};