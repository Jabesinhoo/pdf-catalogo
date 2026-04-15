const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const { buildCatalogHtml } = require("../templates/catalogTemplate");
const { buildQuoteHtml } = require("../templates/quoteTemplate");

const BROWSER_LAUNCH_TIMEOUT = 120000;
const PAGE_TIMEOUT = 120000;
const IMAGE_WAIT_TIMEOUT = 10000;
const RENDER_STABILIZE_MS = 800;

function getBrowserPath() {
  const envPath = process.env.BROWSER_PATH;

  const possiblePaths = [
    envPath,

    // Linux
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/snap/bin/chromium",

    // Windows
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

        // Solo esperamos a que terminen.
        // No exigimos naturalWidth > 0 porque si una imagen falla,
        // eso deja el proceso colgado hasta timeout.
        return images.every((img) => img.complete);
      },
      { timeout }
    );

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `Timeout esperando imágenes (${timeout} ms)`,
    };
  }
}

async function buildCatalogPdf({
  products = [],
  orientation = "portrait",
  sourceUrl = "",
  documentType = "catalog",
  quoteMeta = {},
}) {
  let browser = null;
  let page = null;

  try {
    const executablePath = getBrowserPath();
    const logoSrc = getLogoDataUri();

    console.log("🚀 Lanzando navegador con:", executablePath);
    console.log("📄 Tipo documento:", documentType);
    console.log("📦 Productos:", products.length);

    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      timeout: BROWSER_LAUNCH_TIMEOUT,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-sync",
        "--disable-translate",
        "--metrics-recording-only",
        "--mute-audio",
        "--no-first-run",
        "--disable-default-apps",
      ],
    });

    page = await browser.newPage();

    await page.setViewport({ width: 1400, height: 2000 });
    page.setDefaultNavigationTimeout(PAGE_TIMEOUT);
    page.setDefaultTimeout(PAGE_TIMEOUT);

    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "es-CO,es;q=0.9,en;q=0.8",
    });

    page.on("console", (msg) => {
      console.log("🖥️ PAGE LOG:", msg.type(), msg.text());
    });

    page.on("pageerror", (err) => {
      console.error("❌ PAGE ERROR:", err);
    });

    page.on("requestfailed", (request) => {
      console.error(
        "❌ REQUEST FAILED:",
        request.url(),
        request.failure()?.errorText || "Sin detalle"
      );
    });

    const html =
      documentType === "quote"
        ? buildQuoteHtml({
            products,
            quoteMeta,
            logoSrc,
          })
        : buildCatalogHtml({
            products,
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
    throw error;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (error) {
        console.error("⚠️ Error cerrando page:", error.message);
      }
    }

    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error("⚠️ Error cerrando browser:", error.message);
      }
    }
  }
}

module.exports = { buildCatalogPdf };