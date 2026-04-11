function escapeHtml(text = "") {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/&#8211;/g, "-");
}
function fixImageUrl(url) {
  if (!url) return '';
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  if (url.startsWith('/')) {
    return `https://tecnonacho.com${url}`;
  }
  
  if (url.startsWith('data:image')) {
    return url;
  }
  
  return `https://tecnonacho.com/wp-content/uploads/${url}`;
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

function getQuoteNumbers(product) {
  const quantity = Math.max(1, Number(product.quantity) || 1);
  const ivaType = product.ivaType || 'gravado';
  let ivaRate = Number(product.ivaRate ?? 0) || 0;

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

  const isPrecioFinal = ivaType === 'precio_final';
  const isExcluido = ivaType === 'excluido';
  const isExento = ivaType === 'exento';
  const isGravado5 = ivaType === 'gravado5';
  const isGravado19 = ivaType === 'gravado' || ivaType === 'gravado19';

  if (isGravado19) ivaRate = 19;
  else if (isGravado5) ivaRate = 5;
  else if (isExento) ivaRate = 0;
  else if (isExcluido) ivaRate = 0;
  else if (isPrecioFinal) ivaRate = 0;

  const priceWithIva = finalPrice;

  const priceWithoutIva = (ivaRate > 0 && !isExcluido && !isPrecioFinal)
    ? Math.round(priceWithIva / (1 + ivaRate / 100))
    : priceWithIva;

  const subtotal = priceWithoutIva * quantity;
  const ivaAmount = (isExcluido || isPrecioFinal) ? 0 : (priceWithIva - priceWithoutIva) * quantity;
  const total = (isExcluido || isPrecioFinal) ? priceWithoutIva * quantity : priceWithIva * quantity;

  return {
    quantity,
    ivaType,
    ivaRate,
    isPrecioFinal,
    isExcluido,
    isExento,
    isGravado19,
    isGravado5,
    priceWithoutIva,
    priceWithIva,
    subtotal,
    ivaAmount,
    total,
  };
}

function buildRows(products, currency, orientation) {
  let subtotalGravado = 0;
  let subtotalExento = 0;
  let subtotalExcluido = 0;
  let subtotalPrecioFinal = 0;
  let ivaTotal = 0;

  const rowsHtml = products.map((product) => {
    const q = getQuoteNumbers(product);

    if (q.isExcluido) {
      subtotalExcluido += q.total;
    } else if (q.isExento) {
      subtotalExento += q.total;
    } else if (q.isPrecioFinal) {
      subtotalPrecioFinal += q.total;
    } else {
      subtotalGravado += q.subtotal;
      ivaTotal += q.ivaAmount;
    }

    let ivaDisplay = '';
    if (q.isExcluido) {
      ivaDisplay = '<span class="iva-excluido">Excluido</span>';
    } else if (q.isExento) {
      ivaDisplay = '<span class="iva-exento">Exento 0%</span>';
    } else if (q.isPrecioFinal) {
      ivaDisplay = '<span class="iva-precio-final">Precio Final</span>';
    } else if (q.isGravado5) {
      ivaDisplay = `<span class="iva-gravado">IVA 5% (${escapeHtml(formatMoney(q.ivaAmount, currency))})</span>`;
    } else {
      ivaDisplay = `<span class="iva-gravado">IVA 19% (${escapeHtml(formatMoney(q.ivaAmount, currency))})</span>`;
    }

    const unitPriceDisplay = q.isPrecioFinal 
      ? formatMoney(q.priceWithIva, currency)
      : formatMoney(q.priceWithoutIva, currency);

    return `
      <tr class="product-row">
        <td class="col-qty">${q.quantity}</td>
        <td class="col-description">
          <div class="product-layout ${orientation === 'landscape' ? 'landscape' : ''}">
            <div class="product-text">
              <div class="product-name">
                <a href="${escapeHtml(product.productUrl || '#')}" class="product-link" target="_blank">
                  ${escapeHtml(product.name || "Sin nombre")}
                </a>
              </div>
              <div class="product-desc">${escapeHtml(product.shortDescription || "Sin descripción corta")}</div>
              <div class="product-meta">
                SKU: ${escapeHtml(product.sku || "N/D")}
              </div>
              <div class="product-iva">
                ${ivaDisplay}
              </div>
            </div>
            ${product.image ? `
              <div class="product-image-box ${orientation === 'landscape' ? 'landscape' : ''}">
                <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" />
              </div>
            ` : ''}
          </div>
        </td>
        <td class="col-unit">${escapeHtml(unitPriceDisplay)}</td>
        <td class="col-total">${escapeHtml(formatMoney(q.total, currency))}</td>
      </tr>
    `;
  }).join('');

  const subtotalGeneral = subtotalGravado + subtotalExento + subtotalExcluido + subtotalPrecioFinal;
  const totalGeneral = subtotalGeneral + ivaTotal;
  const valorAPagar = totalGeneral;

  return {
    rows: rowsHtml,
    subtotalGravado,
    subtotalExento,
    subtotalExcluido,
    subtotalPrecioFinal,
    ivaTotal,
    totalGeneral,
    valorAPagar
  };
}

function buildGallery(products) {
  const allImages = products.flatMap(product => product.images || []);
  if (allImages.length === 0) return '';

  return `
    <div class="gallery-section">
      <h3 class="gallery-title">Imagenes adicionales</h3>
      <div class="gallery-grid">
        ${allImages.map(img => `
          <div class="gallery-item">
            <img src="${escapeHtml(img)}" alt="Imagen adicional" loading="lazy" />
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function buildQuoteHtml({ products = [], quoteMeta = {}, logoSrc = "", orientation = "portrait" }) {
  const currency = quoteMeta.currency || "COP";

  const { 
    rows, 
    subtotalGravado, 
    subtotalExento, 
    subtotalExcluido, 
    subtotalPrecioFinal,
    ivaTotal, 
    totalGeneral,
    valorAPagar 
  } = buildRows(products, currency, orientation);

  const dateValue =
    quoteMeta.date ||
    new Date().toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

  // TITULO FIJO EN EL PDF - SIEMPRE DICE "COTIZACION"
  const pdfTitle = "COTIZACION";

  const pageClass = orientation === 'landscape' ? 'page landscape' : 'page';
  const containerClass = orientation === 'landscape' ? 'container landscape' : 'container';
  const paymentNote = quoteMeta.paymentNote || "ESTE PRECIO ES SOLO PARA PAGOS EN EFECTIVO O TRANSFERENCIA";
  
  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Cotización Tecnonacho</title>
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Verdana, Geneva, sans-serif;
            color: #222;
            background: #fff;
          }

          .page {
            padding: ${orientation === 'landscape' ? '6px 8px 10px' : '8px 10px 14px'};
          }

          .page.landscape {
            padding: 5px 8px;
          }

          .container {
            max-width: ${orientation === 'landscape' ? '100%' : '1100px'};
            margin: 0 auto;
          }

          .top-bars {
            display: flex;
            align-items: stretch;
            gap: 0;
            margin-bottom: ${orientation === 'landscape' ? '10px' : '16px'};
          }

          .bar-gray {
            height: ${orientation === 'landscape' ? '20px' : '26px'};
            background: #707070;
            width: 68%;
            clip-path: polygon(0 0, 96% 0, 100% 100%, 0 100%);
          }

          .bar-green {
            height: ${orientation === 'landscape' ? '28px' : '38px'};
            background: #8aa646;
            width: 32%;
            margin-left: -6px;
          }

          .brand-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: ${orientation === 'landscape' ? '8px' : '14px'};
          }

          .logo-box {
            min-height: ${orientation === 'landscape' ? '40px' : '56px'};
            display: flex;
            align-items: center;
          }

          .logo-box img {
            max-height: ${orientation === 'landscape' ? '40px' : '58px'};
            max-width: ${orientation === 'landscape' ? '160px' : '240px'};
            object-fit: contain;
          }

          .doc-title {
            font-size: ${orientation === 'landscape' ? '20px' : '24px'};
            font-weight: 800;
            color: #1e1e1e;
          }

          .meta-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: ${orientation === 'landscape' ? '6px' : '8px'};
            margin: ${orientation === 'landscape' ? '8px 0' : '12px 0'};
          }

          .meta-item {
            border: 1px solid #d1d5db;
            border-radius: 4px;
            padding: ${orientation === 'landscape' ? '4px 6px' : '6px 8px'};
            background: #f9fafb;
          }

          .meta-item strong {
            display: block;
            font-size: ${orientation === 'landscape' ? '9px' : '10px'};
            color: #6b7280;
            text-transform: uppercase;
            margin-bottom: 2px;
          }

          .meta-item span {
            display: block;
            font-size: ${orientation === 'landscape' ? '12px' : '14px'};
            font-weight: 600;
            color: #111827;
          }

          .advisor-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: ${orientation === 'landscape' ? '6px' : '8px'};
            margin: ${orientation === 'landscape' ? '8px 0 12px' : '10px 0 14px'};
          }

          .advisor-card {
            border: 1px solid #8aa646;
            border-radius: 4px;
            padding: ${orientation === 'landscape' ? '4px 6px' : '6px 8px'};
            background: #f8faf5;
          }

          .advisor-card strong {
            display: block;
            font-size: ${orientation === 'landscape' ? '9px' : '10px'};
            color: #4b5563;
            text-transform: uppercase;
            margin-bottom: 2px;
          }

          .advisor-card span {
            display: block;
            font-size: ${orientation === 'landscape' ? '12px' : '14px'};
            font-weight: 600;
            color: #1e1e1e;
          }

          table.quote {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #8aa646;
            font-size: ${orientation === 'landscape' ? '11px' : '12px'};
          }

          table.quote thead th {
            background: #8aa646;
            color: #fff;
            font-size: ${orientation === 'landscape' ? '11px' : '13px'};
            font-weight: 800;
            padding: ${orientation === 'landscape' ? '6px 4px' : '8px 6px'};
            text-align: left;
            border: 1px solid #8aa646;
          }

          .th-qty { width: 8%; text-align: center; }
          .th-description { width: ${orientation === 'landscape' ? '50%' : '52%'}; }
          .th-unit { width: 20%; text-align: right; }
          .th-total { width: 20%; text-align: right; }

          .product-row td {
            border: 1px solid #8aa646;
            vertical-align: top;
            padding: ${orientation === 'landscape' ? '6px 4px' : '8px 6px'};
          }

          .col-qty {
            text-align: center;
            font-weight: 700;
            font-size: ${orientation === 'landscape' ? '12px' : '14px'};
          }

          .col-unit, .col-total {
            text-align: right;
            font-weight: 700;
            font-size: ${orientation === 'landscape' ? '12px' : '14px'};
            white-space: nowrap;
          }

          .product-layout {
            display: flex;
            gap: ${orientation === 'landscape' ? '6px' : '10px'};
            align-items: flex-start;
          }

          .product-layout.landscape {
            gap: 4px;
          }

          .product-text {
            flex: 1;
            min-width: 0;
          }

          .product-name {
            margin-bottom: ${orientation === 'landscape' ? '2px' : '4px'};
          }

          .product-link {
            display: block;
            font-size: ${orientation === 'landscape' ? '14px' : '16px'};
            font-weight: 800;
            line-height: 1.3;
            color: #1e1e1e;
            text-decoration: none;
            word-break: break-word; 
          }

          .product-link:hover {
            color: #8aa646;
          }

          .product-link::after {
            content: ' ';
            font-size: 0.7em;
            opacity: 0.4;
            margin-left: 4px;
          }

          .product-desc {
            font-size: ${orientation === 'landscape' ? '10px' : '11px'};
            line-height: 1.3;
            color: #4b5563;
            margin-bottom: ${orientation === 'landscape' ? '2px' : '4px'};
          }

          .product-meta {
            font-size: ${orientation === 'landscape' ? '9px' : '11px'};
            font-weight: 600;
            color: #4b5563;
            margin-bottom: ${orientation === 'landscape' ? '2px' : '4px'};
          }

          .product-iva {
            font-size: ${orientation === 'landscape' ? '10px' : '12px'};
            font-weight: 700;
            color: #8aa646;
            margin-top: 2px;
          }

          .iva-excluido {
            color: #2563eb;
            font-weight: 600;
            background: rgba(37, 99, 235, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-block;
            font-size: ${orientation === 'landscape' ? '9px' : '11px'};
          }

          .iva-exento {
            color: #16a34a;
            font-weight: 600;
            background: rgba(22, 163, 74, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-block;
            font-size: ${orientation === 'landscape' ? '9px' : '11px'};
          }

          .iva-precio-final {
            color: #6b7280;
            font-weight: 600;
            background: rgba(107, 114, 128, 0.1);
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-block;
            font-size: ${orientation === 'landscape' ? '9px' : '11px'};
          }

          .iva-gravado {
            color: #8aa646;
            font-weight: 600;
          }

          .product-image-box {
            width: ${orientation === 'landscape' ? '100px' : '120px'};
            min-width: ${orientation === 'landscape' ? '100px' : '120px'};
            height: ${orientation === 'landscape' ? '90px' : '110px'};
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 4px;
          }

          .product-image-box.landscape {
            width: 80px;
            min-width: 80px;
            height: 70px;
          }

          .product-image-box img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
          }

          .gallery-section {
            margin: 20px 0 10px;
            page-break-inside: avoid;
          }

          .gallery-title {
            font-size: 16px;
            font-weight: 800;
            color: #1e1e1e;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid #8aa646;
          }

          .gallery-grid {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: flex-start;
            align-items: center;
          }

          .gallery-item {
            width: 250px;
            height: 250px;
            flex-shrink: 0;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            overflow: hidden;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          }

          .gallery-item img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .totals-detailed {
            width: 380px;
            margin-left: auto;
            margin-top: 20px;
            border: 2px solid #8aa646;
            border-radius: 6px;
            overflow: hidden;
            background: #f9fafb;
          }

          .totals-table {
            width: 100%;
            border-collapse: collapse;
          }

          .totals-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #d9e5be;
            font-size: 13px;
          }

          .totals-table tr:last-child td {
            border-bottom: none;
          }

          .total-value {
            text-align: right;
            font-weight: 600;
          }

          .total-row {
            background: #e8f0e0;
            font-weight: 700;
          }

          .payment-row {
            background: #8aa646;
            color: white;
            font-weight: 800;
          }

          .payment-value {
            font-size: 1.1em;
          }

          .payment-note {
            margin-top: ${orientation === 'landscape' ? '8px' : '12px'};
            padding: ${orientation === 'landscape' ? '6px 10px' : '8px 12px'};
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
            font-weight: 700;
            font-size: ${orientation === 'landscape' ? '11px' : '12px'};
            color: #92400e;
          }

          .notes {
            margin-top: ${orientation === 'landscape' ? '10px' : '14px'};
            padding: ${orientation === 'landscape' ? '8px' : '10px'};
            border-top: 1px dashed #cbd5e1;
            font-family: Verdana, Geneva, sans-serif;
            font-size: ${orientation === 'landscape' ? '12px' : '14px'};
            color: #6b7280;
            line-height: 1.5;
          }

          .notes p {
            margin: ${orientation === 'landscape' ? '2px 0' : '3px 0'};
          }

          .bottom-bars {
            display: flex;
            justify-content: flex-end;
            margin-top: ${orientation === 'landscape' ? '8px' : '12px'};
          }

          .bottom-gray {
            height: ${orientation === 'landscape' ? '8px' : '10px'};
            background: #707070;
            width: 78%;
            clip-path: polygon(0 0, 98% 0, 100% 100%, 0 100%);
          }

          .bottom-green {
            height: ${orientation === 'landscape' ? '8px' : '10px'};
            background: #8aa646;
            width: 14%;
            margin-left: -4px;
          }

          @media print {
            .product-row {
              page-break-inside: avoid;
            }
          }

          @media (max-width: 600px) {
            .totals-detailed {
              width: 100%;
            }
            
            .product-image-box {
              width: 80px;
              min-width: 80px;
              height: 70px;
            }
            
            .gallery-item {
              width: 50px;
              height: 50px;
            }
          }
        </style>
      </head>
      <body>
        <main class="${pageClass}">
          <div class="${containerClass}">
            <div class="top-bars">
              <div class="bar-gray"></div>
              <div class="bar-green"></div>
            </div>

            <div class="brand-row">
              <div class="logo-box">
                ${logoSrc ? `<img src="${logoSrc}" alt="Tecnonacho" />` : ''}
              </div>
              <div class="doc-title">${escapeHtml(pdfTitle)}</div>
            </div>

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
                <strong>VALIDEZ</strong>
                <span>${escapeHtml(String(quoteMeta.validityDays || 1))} DIAS</span>
              </div>
            </div>

            <div class="advisor-grid">
              <div class="advisor-card">
                <strong>CARGO</strong>
                <span>${escapeHtml(quoteMeta.role || "-")}</span>
              </div>
              <div class="advisor-card">
                <strong>ASESOR</strong>
                <span>${escapeHtml(quoteMeta.authorName || "-")}</span>
              </div>
              <div class="advisor-card">
                <strong>TELEFONO</strong>
                <span>${escapeHtml(quoteMeta.phone || "-")}</span>
              </div>
              <div class="advisor-card">
                <strong>CORREO</strong>
                <span>${escapeHtml(quoteMeta.email || "-")}</span>
              </div>
            </div>

            <table class="quote">
              <thead>
                <tr>
                  <th class="th-qty">UND</th>
                  <th class="th-description">DESCRIPCION</th>
                  <th class="th-unit">VR. UNIT</th>
                  <th class="th-total">VR. TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>

            ${buildGallery(products)}

            <div class="totals-detailed">
              <table class="totals-table">
                <tr>
                  <td>SUBTOTAL:</td>
                  <td class="total-value">${escapeHtml(formatMoney(totalGeneral, currency))}</td>
                </tr>
                <tr>
                  <td>VR. GRAVADO:</td>
                  <td class="total-value">${escapeHtml(formatMoney(subtotalGravado, currency))}</td>
                </tr>
                <tr>
                  <td>VR. EXCLUIDO:</td>
                  <td class="total-value">${escapeHtml(formatMoney(subtotalExcluido, currency))}</td>
                </tr>
                <tr>
                  <td>VR. PRECIO FINAL:</td>
                  <td class="total-value">${escapeHtml(formatMoney(subtotalPrecioFinal, currency))}</td>
                </tr>
                <tr>
                  <td>IVA:</td>
                  <td class="total-value">${escapeHtml(formatMoney(ivaTotal, currency))}</td>
                </tr>
                <tr class="total-row">
                  <td>TOTAL:</td>
                  <td class="total-value">${escapeHtml(formatMoney(totalGeneral, currency))}</td>
                </tr>
                <tr class="payment-row">
                  <td>VALOR A PAGAR:</td>
                  <td class="total-value payment-value">${escapeHtml(formatMoney(valorAPagar, currency))}</td>
                </tr>
              </table>
            </div>

            <div class="payment-note">
              ${escapeHtml(paymentNote)}
            </div>

            <div class="notes">
              <p>* Disponibilidad sujeta a rotacion de inventario</p>
              <p>* Cotizacion sujeta a analisis y aprobacion</p>
              <p>* Tecno Nacho S.A.S. no es responsable de configuraciones finales</p>
              <p>* No hay devoluciones en licenciamiento</p>
              <p>* Facturadores electronicos</p>
              <p>* Valores NO incluyen transporte</p>
            </div>

            <div class="bottom-bars">
              <div class="bottom-gray"></div>
              <div class="bottom-green"></div>
            </div>
          </div>
        </main>
      </body>
    </html>
  `;
}

module.exports = {
  buildQuoteHtml,
};