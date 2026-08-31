const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const axios = require("axios"); // ✅ Agregado: necesario para convertir imágenes
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const execFileAsync = promisify(execFile);
const { buildCatalogHtml } = require("../templates/catalogTemplate");
const { buildQuoteHtml } = require("../templates/quoteTemplate");

const BROWSER_LAUNCH_TIMEOUT = 180000;
const PAGE_TIMEOUT = 180000;
const PROTOCOL_TIMEOUT = 180000;
const IMAGE_WAIT_TIMEOUT = 15000;
const RENDER_STABILIZE_MS = 500;

const MAX_PDF_CONCURRENCY = Number(process.env.PDF_MAX_CONCURRENCY || 1);
const MAX_PDF_QUEUE = Number(process.env.PDF_MAX_QUEUE || 10);

let browserPromise = null;
let activeJobs = 0;
const waitQueue = [];

// ✅ Cache para imágenes convertidas a base64
const imageCache = new Map();

// ✅ Resolver URL de imagen para generación de PDF
function resolvePdfImageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";

  if (rawUrl.startsWith("data:") || rawUrl.startsWith("file://")) {
    return rawUrl;
  }

  // Las imágenes mostradas en el frontend pasan por:
  // /api/products/image?path=/wp-content/uploads/...
  if (rawUrl.startsWith("/api/products/image")) {
    try {
      const proxyUrl = new URL(rawUrl, "http://localhost");
      const imagePath = proxyUrl.searchParams.get("path") || "";

      if (
        !imagePath.startsWith("/wp-content/uploads/") ||
        imagePath.includes("..") ||
        imagePath.includes("\0")
      ) {
        return "";
      }

      return new URL(imagePath, "https://tecnonacho.com").toString();
    } catch {
      return "";
    }
  }

  return rawUrl;
}

function getImageContentType(imageUrl) {
  try {
    const pathname = new URL(imageUrl).pathname.toLowerCase();

    if (pathname.endsWith(".png")) return "image/png";
    if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) return "image/jpeg";
    if (pathname.endsWith(".webp")) return "image/webp";
    if (pathname.endsWith(".gif")) return "image/gif";
    if (pathname.endsWith(".avif")) return "image/avif";
    if (pathname.endsWith(".svg")) return "image/svg+xml";
  } catch {}

  return "image/jpeg";
}

// ✅ Función para convertir URL de imagen a base64
async function urlToBase64(rawImageUrl) {
  if (!rawImageUrl) return "";

  const imageUrl = resolvePdfImageUrl(rawImageUrl);

  if (!imageUrl) return "";
  if (imageUrl.startsWith("data:")) return imageUrl;
  if (imageUrl.startsWith("file://")) return imageUrl;

  // URLs relativas distintas del proxy no son válidas para el PDF
  if (imageUrl.startsWith("/")) {
    console.warn("⚠️ URL relativa no soportada en PDF:", imageUrl);
    return "";
  }

  if (imageCache.has(imageUrl)) {
    console.log(`✅ Usando caché para: ${imageUrl.substring(0, 50)}...`);
    return imageCache.get(imageUrl);
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(
        `📥 Convirtiendo a base64 (intento ${attempt}): ${imageUrl.substring(0, 80)}...`
      );

      const parsed = new URL(imageUrl);

      let imageBuffer;
      let contentType;

      // TecnoNacho: saltar Hostinger CDN / Under Attack
      if (parsed.hostname === "tecnonacho.com") {
        const { stdout } = await execFileAsync(
          "curl",
          [
            "-4",
            "--http1.1",
            "--resolve",
            "tecnonacho.com:443:147.79.93.157",
            "--location",
            "--silent",
            "--show-error",
            "--fail",
            "--max-time",
            "20",
            "--user-agent",
            "TecnoCotizador-PDF/1.0",
            imageUrl,
          ],
          {
            timeout: 25000,
            maxBuffer: 30 * 1024 * 1024,
            encoding: null,
          }
        );

        imageBuffer = Buffer.from(stdout);
        contentType = getImageContentType(imageUrl);
      } else {
        // Imágenes externas siguen usando Axios normalmente
        const response = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          timeout: 10000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
          },
        });

        imageBuffer = Buffer.from(response.data);
        contentType = response.headers["content-type"] || getImageContentType(imageUrl);
      }

      const base64 = imageBuffer.toString("base64");
      const dataUri = `data:${contentType};base64,${base64}`;

      imageCache.set(imageUrl, dataUri);
      setTimeout(() => imageCache.delete(imageUrl), 3600000);

      console.log(
        `✅ Imagen convertida: ${imageUrl.substring(0, 50)}... (${Math.round(
          imageBuffer.length / 1024
        )} KB)`
      );

      return dataUri;
    } catch (error) {
      console.error(
        `❌ Error convirtiendo imagen (intento ${attempt}): ${imageUrl}`,
        error.message
      );

      if (attempt === 2) {
        return "";
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * attempt)
      );
    }
  }

  return "";
}

// ✅ Función para procesar imágenes de productos
async function processProductImages(products) {
  if (!products || products.length === 0) return products;
  
  const processedProducts = [];
  
  for (const product of products) {
    const processed = { ...product };
    
    // Procesar imagen del producto si existe (verificar diferentes nombres de campo)
    const imageUrl = product.imageUrl || product.image || product.imagen || product.productImage;
    if (imageUrl && typeof imageUrl === 'string' && !imageUrl.startsWith('data:')) {
      processed.imageBase64 = await urlToBase64(imageUrl);
      // Mantener la URL original por si acaso
      processed.originalImageUrl = imageUrl;
    } else if (imageUrl && imageUrl.startsWith('data:')) {
      processed.imageBase64 = imageUrl;
    }
    
    processedProducts.push(processed);
  }
  
  return processedProducts;
}

function getBrowserPath() {
  const envPath = process.env.BROWSER_PATH;

  const possiblePaths = [
    envPath,
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/snap/bin/chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  const found = possiblePaths.find((browserPath) => {
    try {
      return fs.existsSync(browserPath);
    } catch {
      return false;
    }
  });

  if (!found) {
    throw new Error(
      "No encontré un navegador compatible. Define BROWSER_PATH en backend/.env."
    );
  }

  return found;
}

function getLogoDataUri() {
  const logoPath = path.resolve(
    process.cwd(),
    "..",
    "frontend",
    "src",
    "assets",
    "logo.png"
  );

  if (!fs.existsSync(logoPath)) {
    console.warn("⚠️ Logo no encontrado en:", logoPath);
    return "";
  }

  const fileBuffer = fs.readFileSync(logoPath);
  return `data:image/png;base64,${fileBuffer.toString("base64")}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForImages(page, timeout = IMAGE_WAIT_TIMEOUT) {
  try {
    await page.waitForFunction(
      () => {
        const images = Array.from(document.images || []);
        if (images.length === 0) return true;
        return images.every((img) => img.complete);
      },
      { timeout }
    );

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: `Timeout esperando imágenes (${timeout} ms)`,
    };
  }
}

function acquirePdfSlot() {
  return new Promise((resolve, reject) => {
    if (waitQueue.length >= MAX_PDF_QUEUE) {
      return reject(
        new Error("PDF_QUEUE_FULL: servicio de PDF ocupado, intenta de nuevo")
      );
    }

    const tryAcquire = () => {
      if (activeJobs < MAX_PDF_CONCURRENCY) {
        activeJobs += 1;
        resolve();
      } else {
        waitQueue.push(tryAcquire);
      }
    };

    tryAcquire();
  });
}

function releasePdfSlot() {
  activeJobs = Math.max(0, activeJobs - 1);
  const next = waitQueue.shift();
  if (next) next();
}

async function getBrowser() {
  if (browserPromise) {
    try {
      const existing = await browserPromise;
      if (existing && existing.connected) return existing;
    } catch {
      browserPromise = null;
    }
  }

  const executablePath = getBrowserPath();
  console.log("🚀 Lanzando navegador con:", executablePath);

  browserPromise = puppeteer.launch({
    headless: true,
    executablePath,
    timeout: BROWSER_LAUNCH_TIMEOUT,
    protocolTimeout: PROTOCOL_TIMEOUT,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--disable-translate",
      "--metrics-recording-only",
      "--mute-audio",
      "--no-first-run",
      "--disable-default-apps",
      "--font-render-hinting=medium",
    ],
  });

  const browser = await browserPromise;

  browser.on("disconnected", () => {
    console.warn("⚠️ Browser desconectado. Se recreará en la próxima petición.");
    browserPromise = null;
  });

  return browser;
}

async function resetBrowser() {
  if (!browserPromise) return;

  try {
    const browser = await browserPromise;
    browserPromise = null;
    if (browser && browser.connected) {
      await browser.close().catch(() => {});
    }
  } catch {
    browserPromise = null;
  }
}

async function safeClosePage(page) {
  if (!page) return;
  try {
    await Promise.race([
      page.close({ runBeforeUnload: false }),
      sleep(3000),
    ]);
  } catch (error) {
    console.warn("⚠️ Error cerrando page:", error.message);
  }
}

function shouldResetBrowser(error) {
  const msg = String(error?.message || error || "");
  return (
    msg.includes("Target closed") ||
    msg.includes("ProtocolError") ||
    msg.includes("Session closed") ||
    msg.includes("Connection closed")
  );
}

async function buildCatalogPdf({
  products = [],
  orientation = "portrait",
  sourceUrl = "",
  documentType = "catalog",
  quoteMeta = {},
}) {
  let page = null;

  await acquirePdfSlot();
  console.log(`📊 PDFs activos: ${activeJobs}/${MAX_PDF_CONCURRENCY}`);

  try {
    const browser = await getBrowser();
    const logoSrc = getLogoDataUri();

    console.log("📄 Tipo documento:", documentType);
    console.log("📦 Productos:", products.length);

    // ✅ PROCESAR IMÁGENES DE PRODUCTOS ANTES DE GENERAR HTML
    let processedProducts = products;
    if (products && products.length > 0) {
      // Verificar si hay imágenes para procesar
      const hasImages = products.some(p => p.imageUrl || p.image || p.imagen);
      if (hasImages) {
        console.log("🖼️ Procesando imágenes de productos a base64...");
        processedProducts = await processProductImages(products);
        console.log("✅ Imágenes procesadas");
      }
    }

    page = await browser.newPage();

    page.setDefaultNavigationTimeout(PAGE_TIMEOUT);
    page.setDefaultTimeout(PAGE_TIMEOUT);

    await page.setViewport({ width: 1400, height: 2000 });
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
    });
    await page.emulateMediaType("screen");

    // ✅ MEJORAR EVENTOS PARA CAPTURAR ERRORES 429
    page.on("console", (msg) => {
      const text = msg.text();
      console.log("🖥️ PAGE LOG:", msg.type(), text);
      
      // Si es error y contiene 429, mostrar más detalles
      if (msg.type() === 'error' && text.includes('429')) {
        console.error("🚨 ERROR 429 DETECTADO en consola:", text);
      }
    });

    page.on("pageerror", (err) => {
      console.error("❌ PAGE ERROR:", err.message);
    });

    page.on("requestfailed", (request) => {
      const url = request.url();
      const failure = request.failure()?.errorText || "Sin detalle";
      console.error(`❌ REQUEST FAILED [${request.resourceType()}]: ${url} - ${failure}`);
      
      // Especial atención a imágenes
      if (request.resourceType() === 'image') {
        console.error(`🖼️ IMAGEN FALLIDA: ${url}`);
      }
    });

    // ✅ NUEVO: Capturar respuestas con status 429
    page.on("response", async (response) => {
      const status = response.status();
      const url = response.url();
      const resourceType = response.request().resourceType();
      
      if (status === 429) {
        console.error(`🚫 RATELIMIT 429 [${resourceType}]: ${url}`);
        
        // Intentar leer el cuerpo de la respuesta para más detalles
        try {
          const text = await response.text();
          console.error(`   Respuesta: ${text.substring(0, 200)}`);
        } catch (e) {
          // No se pudo leer el cuerpo
        }
      }
    });

    // ✅ Usar productos procesados (con imágenes en base64)
    const html =
      documentType === "quote"
        ? buildQuoteHtml({
            products: processedProducts,  // Usar productos con imágenes convertidas
            quoteMeta,
            logoSrc,
          })
        : buildCatalogHtml({
            products: processedProducts,  // Usar productos con imágenes convertidas
            orientation,
            quoteMeta,
            sourceUrl,
            logoSrc,
          });

    if (!html || typeof html !== "string" || !html.trim()) {
      throw new Error("El HTML generado para el PDF es inválido o está vacío.");
    }

    console.log("🧱 HTML generado. Longitud:", html.length);

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: PAGE_TIMEOUT,
    });

    const imageWaitResult = await waitForImages(page, IMAGE_WAIT_TIMEOUT);
    if (!imageWaitResult.ok) {
      console.warn("⚠️", imageWaitResult.error);
      console.warn("⚠️ Algunas imágenes no cargaron a tiempo, continúo con el PDF");
    } else {
      console.log("🖼️ Imágenes terminadas");
    }

    await sleep(RENDER_STABILIZE_MS);

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: documentType === "catalog" && orientation === "landscape",
      printBackground: true,
      displayHeaderFooter: true,
      preferCSSPageSize: true,
      scale: 0.95,
      headerTemplate: `<div></div>`,
      footerTemplate: `
        <div style="width:100%; font-size:10px; padding:0 18px; color:#666; text-align:right;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>
      `,
      margin: {
        top: "12mm",
        right: "10mm",
        bottom: "16mm",
        left: "10mm",
      },
      timeout: PAGE_TIMEOUT,
    });

    if (!pdfBuffer || !pdfBuffer.length) {
      throw new Error("No se pudo generar el buffer del PDF.");
    }

    console.log("✅ PDF generado correctamente. Bytes:", pdfBuffer.length);
    return pdfBuffer;
  } catch (error) {
    console.error("❌ ERROR en buildCatalogPdf:", error);

    if (shouldResetBrowser(error)) {
      console.warn("⚠️ Reiniciando browser por error de Puppeteer...");
      await resetBrowser();
    }

    throw error;
  } finally {
    await safeClosePage(page);
    releasePdfSlot();
    console.log(`📊 PDFs activos después: ${activeJobs}/${MAX_PDF_CONCURRENCY}`);
  }
}

module.exports = { buildCatalogPdf };
