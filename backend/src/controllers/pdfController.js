const { buildCatalogPdf } = require("../services/pdfService");
const { fetchRealProductPrice } = require("../services/realPriceService");

let activePdfJobs = 0;
const MAX_PDF_JOBS = 2;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSlot() {
  while (activePdfJobs >= MAX_PDF_JOBS) {
    console.log("⏳ Esperando turno para generar PDF...");
    await sleep(300);
  }
}

async function generatePdf(req, res) {
  console.log(
    "Body recibido:",
    JSON.stringify(
      {
        documentType: req.body.documentType,
        productsCount: req.body.products?.length,
        orientation: req.body.orientation,
        quoteMeta: req.body.quoteMeta,
      },
      null,
      2
    )
  );

  let slotTaken = false;

  try {
    const {
      products,
      orientation = "portrait",
      sourceUrl = "",
      documentType = "catalog",
      quoteMeta = {},
    } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        message: "Debes enviar al menos un producto para el PDF.",
      });
    }

    await waitForSlot();
    activePdfJobs++;
    slotTaken = true;

    console.log(`📊 PDFs activos: ${activePdfJobs}/${MAX_PDF_JOBS}`);

    const warnings = [];

    for (const product of products) {
      if (product.sku && product.sku !== "N/D") {
        try {
          const realPrice = await fetchRealProductPrice(product.sku);

          if (realPrice !== null) {
            const priceStr = String(product.price || "0").replace(/[^\d,.-]/g, "");
            const sentPrice = parseFloat(priceStr) || 0;
            const difference = Math.abs(sentPrice - realPrice);

            if (difference > 1000) {
              warnings.push({
                sku: product.sku,
                name: product.name,
                sentPrice,
                realPrice,
                difference,
              });

              console.warn(
                `⚠️ Diferencia detectada: ${product.name} - Enviado: ${sentPrice}, Real: ${realPrice}`
              );
            }
          }
        } catch (error) {
          console.error(`Error validando SKU ${product.sku}:`, error.message);
        }
      }
    }

    if (warnings.length > 0) {
      console.warn("⚠️ Resumen de diferencias:", warnings);
    }

    const startTime = Date.now();

    const pdfBuffer = await buildCatalogPdf({
      products,
      orientation,
      sourceUrl,
      documentType,
      quoteMeta,
    });

    const endTime = Date.now();
    console.log(`✅ PDF generado en ${endTime - startTime} ms`);

    const fileName =
      documentType === "quote"
        ? `cotizacion-${Date.now()}.pdf`
        : `catalogo-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("❌ ERROR en generatePdf:", error);
    console.error("Stack:", error.stack);

    if (!res.headersSent) {
      res.status(500).json({
        message: "No se pudo generar el PDF.",
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  } finally {
    if (slotTaken) {
      activePdfJobs--;

      if (activePdfJobs < 0) {
        activePdfJobs = 0;
      }

      console.log(`📊 PDFs activos después: ${activePdfJobs}/${MAX_PDF_JOBS}`);
    }
  }
}

module.exports = { generatePdf };