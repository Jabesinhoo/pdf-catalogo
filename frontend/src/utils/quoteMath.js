export function parseMoney(value) {
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

export function formatMoney(value, currency = "COP") {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;

  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat("es-CO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

export function getQuoteNumbers(product) {
  const quantity = Math.max(1, Number(product.quantity) || 1);
  const ivaRate = Number(product.ivaRate ?? 0) || 0;
  const unitValue = parseMoney(product.price);
  const subtotal = unitValue * quantity;
  const autoTotal = subtotal * (1 + ivaRate / 100);

  const total =
    product.totalPrice && String(product.totalPrice).trim()
      ? parseMoney(product.totalPrice)
      : autoTotal;

  return {
    quantity,
    ivaRate,
    unitValue,
    subtotal,
    total,
  };
}