const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
});

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const helmet = require("helmet");

const sessionConfig = require("./config/session");
const { pool, verifyDbOnce } = require("./config/db");

const productRoutes = require("./routes/productRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const documentRoutes = require("./routes/documentRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const cacheRoutes = require("./routes/cacheRoutes");
const statsRoutes = require("./routes/statsRoutes");

const { requireAuth } = require("./controllers/authController");
const {
  loginLimiter,
  apiLimiter,
  documentLimiter,
} = require("./middleware/rateLimiter");

const app = express();

app.set("trust proxy", 1);

app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? "https://tecnocotizador.tecnonacho.com"
    : "http://localhost:5173",
  credentials: true,
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb", parameterLimit: 1000000 }));

app.use((req, res, next) => {
  res.setTimeout(600000, () => {
    console.log("Request timeout:", req.method, req.url);
    res.status(504).json({
      success: false,
      message: "Timeout - La operación tomó demasiado tiempo",
    });
  });
  next();
});

app.use(session(sessionConfig));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    message: "Backend funcionando",
    envLoaded: !!process.env.DB_PASSWORD,
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/auth/login", loginLimiter);
app.use("/api/", apiLimiter);
app.use("/api/documents", documentLimiter);
app.use("/api/pdf/generate", documentLimiter);

app.use("/api/products", requireAuth, productRoutes);
app.use("/api/pdf", requireAuth, pdfRoutes);
app.use("/api/documents", requireAuth, documentRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/cache", cacheRoutes);
app.use("/api/stats", statsRoutes);
app.use("/flipbooks", express.static(path.join(__dirname, "public/flipbooks")));

app.use(helmet());

app.use((err, req, res, next) => {
  console.error("❌ Error interno:", err);
  res.status(500).json({
    message: "Error interno del servidor.",
    error: String(err.message || err),
  });
});

const PORT = process.env.PORT || 4017;

async function start() {
  await verifyDbOnce();

  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  });
}

async function shutdown(signal) {
  console.log(`🛑 ${signal} recibido, cerrando servidor...`);
  try {
    await pool.end();
  } catch (err) {
    console.error("❌ Error cerrando pool:", err.message);
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((err) => {
  console.error("❌ Error arrancando app:", err);
  process.exit(1);
});

module.exports = app;