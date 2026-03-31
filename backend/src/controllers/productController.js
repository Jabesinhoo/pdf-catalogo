const { validateTecnonachoUrl } = require("../utils/validateUrl");
const { fetchProducts, fetchCategories } = require("../services/productService");

async function getProducts(req, res) {
  try {
    const {
      mode = "url",
      value = "",
      categories = [],
      stockStatuses = ["instock"],
    } = req.body || {};

    const cleanValue = String(value || "").trim();
    const hasCategories = Array.isArray(categories) && categories.length > 0;

    if (!["url", "name", "sku"].includes(mode)) {
      return res.status(400).json({
        message: "Modo inválido. Usa url, name o sku.",
      });
    }

    if (mode === "url") {
      if (!cleanValue && !hasCategories) {
        return res.status(400).json({
          message:
            "Pega una URL de categoría o selecciona al menos una categoría.",
        });
      }

      if (cleanValue) {
        const valid = validateTecnonachoUrl(cleanValue);

        if (!valid.ok) {
          return res.status(400).json({ message: valid.message });
        }
      }
    }

    const products = await fetchProducts({
      mode,
      value: cleanValue,
      categories,
      stockStatuses,
    });

    return res.json({
      message: "Productos cargados correctamente.",
      count: products.length,
      products,
    });
  } catch (error) {
    const message = String(error.message || "");

    if (
      message.includes("slug de la categoría") ||
      message.includes("URL de categoría")
    ) {
      return res.status(400).json({
        message: message,
      });
    }

    return res.status(500).json({
      message: "No se pudieron cargar los productos.",
      error: message,
    });
  }
}

async function getCategories(req, res) {
  try {
    const categories = await fetchCategories();

    return res.json(categories);
  } catch (error) {
    return res.status(500).json({
      message: "No se pudieron cargar las categorías.",
      error: String(error.message || error),
    });
  }
}

module.exports = {
  getProducts,
  getCategories,
};