function validateTecnonachoUrl(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return {
      ok: false,
      message:
        "Debes pegar una URL de categoría de Tecnonacho. Ejemplo: https://tecnonacho.com/categoria-producto/...",
    };
  }

  let url;

  try {
    url = new URL(raw);
  } catch {
    return {
      ok: false,
      message: "La URL no es válida.",
    };
  }

  const hostname = url.hostname.replace(/^www\./i, "").toLowerCase();

  if (hostname !== "tecnonacho.com") {
    return {
      ok: false,
      message: "La URL debe pertenecer a tecnonacho.com.",
    };
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const categoryIndex = parts.indexOf("categoria-producto");

  if (categoryIndex === -1) {
    return {
      ok: false,
      message:
        "Debes pegar una URL de categoría de Tecnonacho, no la página principal.",
    };
  }

  const slug = parts[parts.length - 1];

  if (!slug || slug === "categoria-producto") {
    return {
      ok: false,
      message: "No pude obtener el slug de la categoría desde la URL.",
    };
  }

  return {
    ok: true,
    normalizedUrl: url.toString(),
    slug,
  };
}

module.exports = { validateTecnonachoUrl };