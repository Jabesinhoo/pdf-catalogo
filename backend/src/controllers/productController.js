const { validateTecnonachoUrl } = require("../utils/validateUrl");
const { fetchProducts, fetchCategories } = require("../services/productService");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const execFileAsync = promisify(execFile);

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


async function getProductImage(req, res) {
  try {
    const imagePath = String(req.query.path || "");

    if (
      !imagePath.startsWith("/wp-content/uploads/") ||
      imagePath.includes("..") ||
      imagePath.includes("\0")
    ) {
      return res.status(400).json({
        message: "Ruta de imagen no permitida.",
      });
    }

    const target = new URL(imagePath, "https://tecnonacho.com");

    if (
      target.hostname !== "tecnonacho.com" ||
      !target.pathname.startsWith("/wp-content/uploads/")
    ) {
      return res.status(400).json({
        message: "Ruta de imagen no permitida.",
      });
    }

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
        "TecnoCotizador/1.0",
        target.toString(),
      ],
      {
        timeout: 25000,
        maxBuffer: 30 * 1024 * 1024,
        encoding: null,
      }
    );

    const pathname = target.pathname.toLowerCase();

    let contentType = "application/octet-stream";

    if (pathname.endsWith(".png")) {
      contentType = "image/png";
    } else if (
      pathname.endsWith(".jpg") ||
      pathname.endsWith(".jpeg")
    ) {
      contentType = "image/jpeg";
    } else if (pathname.endsWith(".webp")) {
      contentType = "image/webp";
    } else if (pathname.endsWith(".gif")) {
      contentType = "image/gif";
    } else if (pathname.endsWith(".avif")) {
      contentType = "image/avif";
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=86400");

    return res.send(stdout);

  } catch (error) {
    console.error("❌ Error proxy imagen:", error.message);

    return res.status(502).json({
      message: "No se pudo cargar la imagen.",
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
  getProductImage,
};