const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const { buildCatalogHtml } = require("../templates/catalogTemplate");
const { buildQuoteHtml } = require("../templates/quoteTemplate");

function getBrowserPath() {
  const envPath = process.env.BROWSER_PATH;

  const possiblePaths = [
    envPath,

    // Linux
    "/snap/bin/chromium",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",

    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  const found = possiblePaths.find((browserPath) => fs.existsSync(browserPath));

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
    return "";
  }

  const fileBuffer = fs.readFileSync(logoPath);
  return `data:image/png;base64,${fileBuffer.toString("base64")}`;
}

async function buildCatalogPdf({
  products,
  orientation,
  sourceUrl,
  documentType,
  quoteMeta,
}) {
  
  
  const executablePath = getBrowserPath();
  const logoSrc = getLogoDataUri();

  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--max_old_space_size=512",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor"
    ],
    timeout: 120000
  });

  try {
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1600, height: 2000 });

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


    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: documentType === "catalog" && orientation === "landscape",
      printBackground: true,
      displayHeaderFooter: true,
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
    });

    return pdfBuffer;
  } catch (error) {
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = { buildCatalogPdf };