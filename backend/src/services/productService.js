const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://tecnonacho.com";

const CACHE_TTL_MS = 60 * 1000;
const memoryCache = new Map();

/*
 * Caché específica de categorías.
 * Las categorías cambian muy poco y no deben consultarse a WooCommerce
 * cada vez que un asesor abre el cotizador.
 */
const CATEGORIES_CACHE_TTL_MS = 30 * 60 * 1000;
let categoriesCache = null;
let categoriesCacheCreatedAt = 0;
let categoriesFetchInFlight = null;

const fs = require("fs");
const path = require("path");

const CATEGORIES_CACHE_FILE = path.join(
  __dirname,
  "../../cache/categories-cache.json"
);

function loadPersistentCategoriesCache() {
  try {
    if (!fs.existsSync(CATEGORIES_CACHE_FILE)) return;

    const raw = fs.readFileSync(CATEGORIES_CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (
      Array.isArray(parsed.categories) &&
      parsed.categories.length > 0
    ) {
      categoriesCache = parsed.categories;
      categoriesCacheCreatedAt =
        Number(parsed.createdAt) || Date.now();

      console.log(
        `✅ Caché persistente de categorías cargada: ${categoriesCache.length} categorías`
      );
    }
  } catch (error) {
    console.warn(
      "⚠️ No se pudo cargar la caché persistente de categorías:",
      error.message
    );
  }
}

function savePersistentCategoriesCache(categories) {
  try {
    if (!Array.isArray(categories) || categories.length === 0) return;

    fs.mkdirSync(path.dirname(CATEGORIES_CACHE_FILE), {
      recursive: true,
    });

    const payload = {
      createdAt: Date.now(),
      categories,
    };

    const tempFile = `${CATEGORIES_CACHE_FILE}.tmp`;

    fs.writeFileSync(
      tempFile,
      JSON.stringify(payload),
      "utf8"
    );

    fs.renameSync(tempFile, CATEGORIES_CACHE_FILE);
  } catch (error) {
    console.warn(
      "⚠️ No se pudo guardar la caché persistente de categorías:",
      error.message
    );
  }
}

loadPersistentCategoriesCache();

/*
 * Evita duplicar solicitudes externas idénticas.
 * Si varios asesores piden el mismo recurso simultáneamente,
 * todos esperan la misma Promise.
 */
const inFlightRequests = new Map();
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

async function fetchJson(url, retries = 2, directOrigin = false) {
  const cached = memoryCache.get(url);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.data;
  }

  /*
   * Si esta misma URL ya está siendo consultada,
   * no crear otro proceso curl.
   * Todos los solicitantes esperan la misma Promise.
   */
  if (inFlightRequests.has(url)) {
    return inFlightRequests.get(url);
  }

  const requestPromise = (async () => {
    const { execFile } = require("node:child_process");
    const { promisify } = require("node:util");
    const execFileAsync = promisify(execFile);

    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        const { stdout } = await execFileAsync(
          "curl",
          [
            "-4",
            "--http1.1",
            ...(directOrigin
              ? ["--resolve", "tecnonacho.com:443:147.79.93.157"]
              : []),
            "--location",
            "--silent",
            "--show-error",
            "--fail-with-body",
            "--compressed",
            "--max-time",
            "45",
            "--user-agent",
            "TecnoCotizador/1.0",
            "--header",
            "Accept: application/json,text/plain,*/*",
            "--header",
            "Accept-Language: es-CO,es;q=0.9,en;q=0.8",
            "--header",
            "Referer: https://tecnonacho.com/",
            url,
          ],
          {
            timeout: 50000,
            maxBuffer: 50 * 1024 * 1024,
            encoding: "utf8",
          }
        );

        let data;

        try {
          data = JSON.parse(stdout);
        } catch {
          throw new Error(
            `WooCommerce no devolvió JSON válido: ${stdout.slice(0, 300)}`
          );
        }

        memoryCache.set(url, {
          data,
          createdAt: Date.now(),
        });

        return data;
      } catch (error) {
        const detail =
          String(error.stderr || "").trim() ||
          String(error.stdout || "").slice(0, 300) ||
          error.message;

        console.warn(
          `⚠️ Intento ${attempt}/${retries} con curl falló:`,
          detail
        );

        if (attempt === retries) {
          throw new Error(`curl failed: ${detail}`);
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * attempt)
        );
      }
    }

    throw new Error("No se pudo completar la consulta a WooCommerce.");
  })();

  inFlightRequests.set(url, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(url);
  }
}

function buildImageProxyUrl(src) {
  if (!src) return "";

  try {
    const imageUrl = new URL(src);

    if (
      imageUrl.hostname !== "tecnonacho.com" ||
      !imageUrl.pathname.startsWith("/wp-content/uploads/")
    ) {
      return src;
    }

    const imagePath = imageUrl.pathname + imageUrl.search;

    return `/api/products/image?path=${encodeURIComponent(imagePath)}`;
  } catch {
    return src;
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
    image: buildImageProxyUrl(
      item.images?.[0]?.thumbnail || item.images?.[0]?.src || ""
    ),
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
        const batch = await fetchJson(endpoint, 2, false);

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
  const now = Date.now();

  // 1. Respuesta inmediata desde caché
  if (
    Array.isArray(categoriesCache) &&
    categoriesCache.length > 0 &&
    now - categoriesCacheCreatedAt < CATEGORIES_CACHE_TTL_MS
  ) {
    return categoriesCache;
  }

  // 2. Si ya hay una consulta de categorías en curso,
  // reutilizarla en vez de abrir otra contra WooCommerce.
  if (categoriesFetchInFlight) {
    return categoriesFetchInFlight;
  }

  categoriesFetchInFlight = (async () => {
    const all = [];
    const seen = new Set();
    const perPage = 100;

    try {
      for (let page = 1; page <= 50; page += 1) {
        const url = new URL(
          "/wp-json/wc/store/v1/products/categories",
          SITE_ORIGIN
        );

        url.searchParams.set("per_page", String(perPage));
        url.searchParams.set("page", String(page));
        url.searchParams.set("hide_empty", "false");

        let batch;

        try {
          // Ruta principal: Cloudflare
          batch = await fetchJson(url.toString(), 2, false);
        } catch (cloudflareError) {
          console.warn(
            `⚠️ Cloudflare falló cargando categorías (página ${page}); probando origen directo:`,
            cloudflareError.message
          );

          // Fallback: Hostinger directo
          batch = await fetchJson(url.toString(), 2, true);
        }

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

      const result = all.sort((a, b) =>
        String(a.name || "").localeCompare(
          String(b.name || ""),
          "es",
          { sensitivity: "base" }
        )
      );

      if (result.length > 0) {
        categoriesCache = result;
        categoriesCacheCreatedAt = Date.now();
        savePersistentCategoriesCache(result);
      }

      return result;
    } catch (error) {
      /*
       * Si WooCommerce tiene un microcorte, devolver las últimas
       * categorías conocidas en vez de dejar el cotizador vacío.
       */
      if (Array.isArray(categoriesCache) && categoriesCache.length > 0) {
        console.warn(
          "⚠️ WooCommerce falló obteniendo categorías; usando caché anterior:",
          error.message
        );

        return categoriesCache;
      }

      throw error;
    } finally {
      categoriesFetchInFlight = null;
    }
  })();

  return categoriesFetchInFlight;
}

module.exports = {
  fetchProducts,
  fetchCategories,
};