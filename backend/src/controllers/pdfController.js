const { buildCatalogPdf } = require("../services/pdfService");
const { fetchRealProductPrice } = require("../services/realPriceService");

async function generatePdf(req, res) {
  console.log('Body recibido:', JSON.stringify({
    documentType: req.body.documentType,
    productsCount: req.body.products?.length,
    orientation: req.body.orientation,
    quoteMeta: req.body.quoteMeta
  }, null, 2));
  
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


    // Validación de seguridad - SOLO INFORMATIVA
    const warnings = [];
    
    for (const product of products) {
      if (product.sku && product.sku !== "N/D") {
        try {
          const realPrice = await fetchRealProductPrice(product.sku);
          
          if (realPrice !== null) {
            const priceStr = String(product.price || '0').replace(/[^\d,.-]/g, '');
            const sentPrice = parseFloat(priceStr) || 0;
            const difference = Math.abs(sentPrice - realPrice);
            
            if (difference > 1000) {
              warnings.push({
                sku: product.sku,
                name: product.name,
                sentPrice,
                realPrice,
                difference
              });
              console.warn(`⚠️ Diferencia detectada: ${product.name} - Enviado: ${sentPrice}, Real: ${realPrice}`);
            }
          }
        } catch (error) {
          console.error(`Error validando SKU ${product.sku}:`, error.message);
        }
      }
    }

    if (warnings.length > 0) {
      console.warn('⚠️ Resumen de diferencias:', warnings);
    }

    // Generar PDF
    const startTime = Date.now();
    
    const pdfBuffer = await buildCatalogPdf({
      products,
      orientation,
      sourceUrl,
      documentType,
      quoteMeta,
    });

    const endTime = Date.now();

    const fileName =
      documentType === "quote"
        ? `cotizacion-${Date.now()}.pdf`
        : `catalogo-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('❌ ERROR en generatePdf:', error);
    console.error('Stack:', error.stack);
    
    if (!res.headersSent) {
      res.status(500).json({
        message: "No se pudo generar el PDF.",
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
}

module.exports = { generatePdf };