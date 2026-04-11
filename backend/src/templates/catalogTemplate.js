function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseMoney(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;

  let text = String(value).trim();
  text = text.replace(/[^\d,.-]/g, "");

  const dotCount = (text.match(/\./g) || []).length;
  const commaCount = (text.match(/,/g) || []).length;

  if (dotCount > 0 && commaCount > 0) {
    const lastDot = text.lastIndexOf(".");
    const lastComma = text.lastIndexOf(",");

    if (lastComma > lastDot) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (dotCount > 0) {
    const parts = text.split(".");
    const last = parts[parts.length - 1];

    if (parts.length > 2 || (last && last.length === 3)) {
      text = parts.join("");
    }
  } else if (commaCount > 0) {
    const parts = text.split(",");
    const last = parts[parts.length - 1];

    if (parts.length > 2 || (last && last.length === 3)) {
      text = parts.join("");
    } else {
      text = text.replace(",", ".");
    }
  }

  const number = Number.parseFloat(text);
  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value, currency = "COP") {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;

  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return "$" + new Intl.NumberFormat("es-CO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

function getCatalogNumbers(product) {
  // Calcular precio ajustado
  let finalPrice = parseMoney(product.price);
  if (product.priceAdjustOp && product.priceAdjustValue) {
    const adjustValue = parseFloat(product.priceAdjustValue);
    if (!isNaN(adjustValue) && adjustValue > 0) {
      if (product.priceAdjustOp === '/') {
        finalPrice = finalPrice / adjustValue;
      } else if (product.priceAdjustOp === '*') {
        finalPrice = finalPrice * adjustValue;
      }
    }
  }

  const priceWithIva = finalPrice;
  const ivaType = product.ivaType || 'gravado';
  let ivaRate = Number(product.ivaRate ?? 0) || 0;

  const isExcluido = ivaType === 'excluido';
  const isExento = ivaType === 'exento';
  const isGravado5 = ivaType === 'gravado5';
  const isGravado19 = ivaType === 'gravado' || ivaType === 'gravado19';
  const isPrecioFinal = ivaType === 'precio_final';

  if (isGravado19) ivaRate = 19;
  else if (isGravado5) ivaRate = 5;
  else if (isExento) ivaRate = 0;
  else if (isExcluido) ivaRate = 0;
  else if (isPrecioFinal) ivaRate = 0;

  const priceWithoutIva = (ivaRate > 0 && !isExcluido && !isPrecioFinal)
    ? Math.round(priceWithIva / (1 + ivaRate / 100))
    : priceWithIva;

  const ivaAmount = (isExcluido || isPrecioFinal) ? 0 : (priceWithIva - priceWithoutIva);

  return {
    ivaType,
    ivaRate,
    isPrecioFinal,
    priceWithoutIva,
    priceWithIva,
    ivaAmount,
    isExcluido,
    isExento,
    isGravado19,
    isGravado5
  };
}

function getIvaBadge(product) {
  const q = getCatalogNumbers(product);
  
  if (q.isExcluido) {
    return '<span class="iva-badge iva-excluido">EXCLUIDO</span>';
  } else if (q.isExento) {
    return '<span class="iva-badge iva-exento">EXENTO 0%</span>';
  } else if (q.isPrecioFinal) {
    return '<span class="iva-badge iva-precio-final">PRECIO FINAL</span>';
  } else if (q.isGravado5) {
    return `<span class="iva-badge iva-gravado">GRAVADO 5% (${formatMoney(q.ivaAmount)})</span>`;
  } else {
    return `<span class="iva-badge iva-gravado">GRAVADO ${q.ivaRate}% (${formatMoney(q.ivaAmount)})</span>`;
  }
}

function buildRows(products = []) {
  return products
    .map((product, index) => {
      const productUrl = product.productUrl || '#';
      const ivaBadge = getIvaBadge(product);
      const q = getCatalogNumbers(product);
      
      // Para PRECIO FINAL no mostrar desglose
      const showBreakdown = !q.isPrecioFinal;
      
      return `
        <tr class="product-row">
          <td class="col-item">${index + 1}<\/td>
          <td class="col-description">
            <div class="product-layout">
              <div class="product-text">
                <a href="${escapeHtml(productUrl)}" class="product-link" target="_blank">
                  ${escapeHtml(product.name || "Sin nombre")}
                </a>
                <div class="product-desc">${escapeHtml(product.shortDescription || "Sin descripción corta")}</div>
                <div class="product-meta">
                  SKU: ${escapeHtml(product.sku || "N/D")}
                </div>
                <div class="product-iva">
                  ${ivaBadge}
                </div>
                ${showBreakdown ? `
                  <div class="product-price-breakdown">
                    <span class="price-without-iva">Sin IVA: ${escapeHtml(formatMoney(q.priceWithoutIva))}</span>
                    <span class="price-with-iva">Con IVA: ${escapeHtml(formatMoney(q.priceWithIva))}</span>
                  </div>
                ` : ''}
              </div>

              <div class="product-image-box">
                ${
                  product.image
                    ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name || "Producto")}" />`
                    : `<div class="image-empty">Sin imagen</div>`
                }
              </div>
            </div>
          <\/td>
          <td class="col-price">${escapeHtml(formatMoney(q.priceWithIva))}<\/td>
        <\/tr>
      `;
    })
    .join("");
}

function buildCatalogHtml({ products, quoteMeta = {}, logoSrc = "" }) {
  const currency = quoteMeta.currency || "COP";
  
  const dateValue =
    quoteMeta.date ||
    new Date().toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  // TITULO FIJO EN EL PDF - SIEMPRE DICE "CATÁLOGO"
  const pdfTitle = "CATÁLOGO";

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Catálogo Tecnonacho</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: #222;
            background: #fff;
          }

          .page {
            padding: 8px 10px 14px;
          }

          .top-bars {
            display: flex;
            align-items: stretch;
            gap: 0;
            margin-bottom: 16px;
          }

          .bar-gray {
            height: 26px;
            background: #707070;
            width: 68%;
            clip-path: polygon(0 0, 96% 0, 100% 100%, 0 100%);
          }

          .bar-green {
            height: 38px;
            background: #8aa646;
            width: 32%;
            margin-left: -6px;
          }

          .brand-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
          }

          .logo-box {
            min-height: 56px;
            display: flex;
            align-items: center;
          }

          .logo-box img {
            max-height: 58px;
            max-width: 240px;
            object-fit: contain;
            display: block;
          }

          .company-info {
            text-align: right;
          }

          .company-info h1 {
            margin: 0 0 6px;
            font-size: 24px;
            color: #1e1e1e;
          }

          .company-info p {
            margin: 2px 0;
            font-size: 12px;
            color: #475569;
          }

          .doc-title {
            font-size: 24px;
            font-weight: 800;
            color: #1e1e1e;
            text-align: right;
            margin-top: 8px;
          }

          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin: 16px 0 20px;
          }

          .meta-item {
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 8px 12px;
            background: #f9fafb;
          }

          .meta-item strong {
            display: block;
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 4px;
          }

          .meta-item span {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #111827;
          }

          table.catalog {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            border: 2px solid #8aa646;
          }

          table.catalog thead th {
            background: #8aa646;
            color: #fff;
            font-size: 14px;
            font-weight: 800;
            padding: 9px 8px;
            text-align: left;
            border: 1px solid #8aa646;
          }

          .th-item {
            width: 7%;
            text-align: center;
          }

          .th-description {
            width: 68%;
          }

          .th-price {
            width: 25%;
            text-align: left;
          }

          .product-row td {
            border: 1px solid #8aa646;
            vertical-align: top;
            padding: 8px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .col-item {
            text-align: center;
            font-size: 15px;
            font-weight: 700;
          }

          .col-price {
            font-size: 18px;
            font-weight: 700;
            color: #2b2b2b;
            white-space: nowrap;
          }

          .product-layout {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            justify-content: space-between;
          }

          .product-text {
            flex: 1;
            min-width: 0;
          }

          .product-link {
            display: block;
            font-size: 18px;
            font-weight: 800;
            line-height: 1.25;
            margin-bottom: 8px;
            color: #1e1e1e;
            text-decoration: none;
          }

          .product-link:hover {
            color: #8aa646;
          }

          .product-desc {
            font-size: 13px;
            line-height: 1.42;
            color: #333;
            margin-bottom: 10px;
            word-break: break-word;
          }

          .product-meta {
            font-size: 13px;
            font-weight: 700;
            color: #333;
            margin-bottom: 4px;
          }

          .product-iva {
            font-size: 12px;
            font-weight: 700;
            margin-top: 4px;
            margin-bottom: 6px;
          }

          .product-price-breakdown {
            font-size: 11px;
            display: flex;
            gap: 12px;
            margin-top: 6px;
            padding-top: 4px;
            border-top: 1px dashed #e5e7eb;
          }

          .price-without-iva {
            color: #6b7280;
          }

          .price-with-iva {
            color: #8aa646;
            font-weight: 600;
          }

          .iva-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }

          .iva-excluido {
            background: #2563eb;
            color: white;
          }

          .iva-exento {
            background: #16a34a;
            color: white;
          }

          .iva-precio-final {
            background: #6b7280;
            color: white;
          }

          .iva-gravado {
            background: #8aa646;
            color: white;
          }

          .product-image-box {
            width: 170px;
            min-width: 170px;
            height: 135px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
          }

          .product-image-box img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            display: block;
          }

          .image-empty {
            font-size: 12px;
            color: #777;
          }

          .bottom-bars {
            display: flex;
            justify-content: flex-end;
            margin-top: 14px;
          }

          .bottom-gray {
            height: 12px;
            background: #707070;
            width: 78%;
            clip-path: polygon(0 0, 98% 0, 100% 100%, 0 100%);
          }

          .bottom-green {
            height: 12px;
            background: #8aa646;
            width: 14%;
            margin-left: -4px;
          }

          @media print {
            .product-row {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <div class="top-bars">
            <div class="bar-gray"></div>
            <div class="bar-green"></div>
          </div>

          <div class="brand-row">
            <div class="logo-box">
              ${logoSrc ? `<img src="${logoSrc}" alt="Tecnonacho" />` : ``}
            </div>
            <div class="company-info">
              <h1>${escapeHtml(quoteMeta.companyName || "TECNONACHO S.A.S")}</h1>
              <p><strong>NIT:</strong> ${escapeHtml(quoteMeta.nit || "901.067.698-7")}</p>
            </div>
          </div>

          <div class="doc-title">${escapeHtml(pdfTitle)}</div>

          <div class="meta-grid">
            <div class="meta-item">
              <strong>FECHA</strong>
              <span>${escapeHtml(dateValue)}</span>
            </div>
            <div class="meta-item">
              <strong>CLIENTE</strong>
              <span>${escapeHtml(quoteMeta.customerName || "")}</span>
            </div>
            <div class="meta-item">
              <strong>MONEDA</strong>
              <span>${escapeHtml(currency)}</span>
            </div>
            <div class="meta-item">
              <strong>ASESOR</strong>
              <span>${escapeHtml(quoteMeta.authorName || "")}</span>
            </div>
          </div>

          <table class="catalog">
            <thead>
              <tr>
                <th class="th-item">#</th>
                <th class="th-description">DESCRIPCION</th>
                <th class="th-price">VR. UNIT</th>
              </tr>
            </thead>
            <tbody>
              ${buildRows(products)}
            </tbody>
          </table>

          <div class="bottom-bars">
            <div class="bottom-gray"></div>
            <div class="bottom-green"></div>
          </div>
        </main>
      </body>
    </html>
  `;
}

module.exports = { buildCatalogHtml };