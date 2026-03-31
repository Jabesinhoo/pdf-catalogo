const cheerio = require("cheerio");

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const REQUEST_DELAY_MS = 700;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanText(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

function absoluteUrl(base, maybeRelative) {
  try {
    return new URL(maybeRelative, base).href;
  } catch {
    return maybeRelative || "";
  }
}

async function getHtml(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": USER_AGENT,
      "accept-language": "es-CO,es;q=0.9,en;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Error ${response.status} consultando ${url}`);
  }

  return response.text();
}

function getCodeFromText(text = "") {
  const patterns = [
    /Código:\s*([A-Za-z0-9._/-]+)/i,
    /SKU:\s*([A-Za-z0-9._/-]+)/i,
    /Código de producto:\s*([A-Za-z0-9._/-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }

  return "N/D";
}

function getShortDescriptionFromDetail($) {
  const candidates = [
    $(".woocommerce-product-details__short-description").first().text(),
    $(".summary .woocommerce-product-details__short-description").first().text(),
    $(".summary > p").first().text(),
    $("meta[property='og:description']").attr("content"),
  ];

  for (const value of candidates) {
    const clean = cleanText(value);
    if (clean) return clean;
  }

  return "Sin descripción corta";
}

async function scrapeProductDetail(productUrl, fallback = {}) {
  const html = await getHtml(productUrl);
  const $ = cheerio.load(html);
  const bodyText = cleanText($("body").text());

  const name =
    cleanText($("h1.product_title").first().text()) ||
    cleanText($("h1.entry-title").first().text()) ||
    fallback.name ||
    "Sin nombre";

  const price =
    cleanText($(".summary .price").first().text()) ||
    cleanText($(".price").first().text()) ||
    fallback.price ||
    "No disponible";

  const sku =
    cleanText($(".sku").first().text()) ||
    getCodeFromText(bodyText) ||
    fallback.sku ||
    "N/D";

  const shortDescription = getShortDescriptionFromDetail($);

  const image =
    $(".woocommerce-product-gallery__image img").first().attr("src") ||
    $(".woocommerce-product-gallery__wrapper img").first().attr("src") ||
    $("img.wp-post-image").first().attr("src") ||
    $("meta[property='og:image']").attr("content") ||
    fallback.image ||
    "";

  return {
    id: productUrl,
    name,
    sku,
    shortDescription,
    price,
    image: absoluteUrl(productUrl, image),
    productUrl,
    selected: true,
  };
}

function extractProductCards(categoryHtml, categoryUrl) {
  const $ = cheerio.load(categoryHtml);
  const cards = [];
  const seen = new Set();

  $("li.product").each((_, el) => {
    const card = $(el);

    const url =
      card.find("a[href*='/producto/']").first().attr("href") || "";

    const absoluteProductUrl = absoluteUrl(categoryUrl, url);

    if (!absoluteProductUrl || seen.has(absoluteProductUrl)) return;
    seen.add(absoluteProductUrl);

    const name =
      cleanText(card.find("h2").first().text()) ||
      cleanText(card.find(".woocommerce-loop-product__title").first().text()) ||
      "Sin nombre";

    const price =
      cleanText(card.find(".price").first().text()) || "No disponible";

    const image =
      card.find("img").first().attr("src") ||
      card.find("img").first().attr("data-src") ||
      "";

    cards.push({
      id: absoluteProductUrl,
      name,
      sku: "N/D",
      shortDescription: "Sin descripción corta",
      price,
      image: absoluteUrl(categoryUrl, image),
      productUrl: absoluteProductUrl,
      selected: true,
    });
  });

  return cards;
}

async function getCategoryPages(startUrl) {
  const visited = new Set();
  const pages = [];
  let nextUrl = startUrl;

  while (nextUrl && !visited.has(nextUrl)) {
    visited.add(nextUrl);
    pages.push(nextUrl);

    const html = await getHtml(nextUrl);
    const $ = cheerio.load(html);

    const nextHref =
      $("a.next.page-numbers").attr("href") ||
      $("link[rel='next']").attr("href") ||
      null;

    nextUrl = nextHref ? absoluteUrl(startUrl, nextHref) : null;

    if (nextUrl) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  return pages;
}

async function scrapeCategoryProducts(categoryUrl) {
  const pages = await getCategoryPages(categoryUrl);
  const baseProducts = [];
  const seen = new Set();

  for (const pageUrl of pages) {
    const html = await getHtml(pageUrl);
    const pageProducts = extractProductCards(html, pageUrl);

    for (const product of pageProducts) {
      if (seen.has(product.productUrl)) continue;
      seen.add(product.productUrl);
      baseProducts.push(product);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  const detailedProducts = [];

  for (const product of baseProducts) {
    try {
      const detailed = await scrapeProductDetail(product.productUrl, product);
      detailedProducts.push(detailed);
    } catch (error) {
      detailedProducts.push(product);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  return detailedProducts;
}

module.exports = { scrapeCategoryProducts };