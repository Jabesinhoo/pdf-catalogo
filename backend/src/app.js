const path = require('path');

// 🔥 CARGA FORZADA DEL .ENV
require('dotenv').config({
  path: path.resolve(__dirname, '../.env')
});

const express = require("express");
const cors = require("cors");
const session = require('express-session');
const sessionConfig = require('./config/session');
const productRoutes = require("./routes/productRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const documentRoutes = require("./routes/documentRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { requireAuth } = require('./controllers/authController');
const { loginLimiter, apiLimiter, documentLimiter } = require('./middleware/rateLimiter');
const helmet = require('helmet');
const cacheRoutes = require('./routes/cacheRoutes');
const statsRoutes = require("./routes/statsRoutes");

const app = express();

// 🔥 IMPORTANTE PARA VPS + PROXY
app.set('trust proxy', 1);

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://tecnocotizador.tecnonacho.com' 
    : 'http://localhost:5173',
  credentials: true,
}));

// BODY
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb", parameterLimit: 1000000 }));

// TIMEOUT GLOBAL
app.use((req, res, next) => {
  res.setTimeout(600000, () => {
    console.log('Request timeout:', req.method, req.url);
    res.status(504).json({ 
      success: false, 
      message: 'Timeout - La operación tomó demasiado tiempo' 
    });
  });
  next();
});

// SESSION
app.use(session(sessionConfig));

// HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ 
    ok: true, 
    message: "Backend funcionando",
    envLoaded: !!process.env.DB_PASSWORD
  });
});

// AUTH
app.use("/api/auth", authRoutes);

// LIMITERS
app.use('/api/auth/login', loginLimiter);
app.use('/api/', apiLimiter);
app.use('/api/documents', documentLimiter);
app.use('/api/pdf/generate', documentLimiter);

// PROTEGIDAS
app.use("/api/products", requireAuth, productRoutes);
app.use("/api/pdf", requireAuth, pdfRoutes);
app.use("/api/documents", requireAuth, documentRoutes);
app.use("/api/admin", adminRoutes);

// EXTRA
app.use("/api/cache", cacheRoutes);
app.use("/api/stats", statsRoutes);
app.use('/flipbooks', express.static(path.join(__dirname, 'public/flipbooks')));

// SEGURIDAD
app.use(helmet());

// ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('❌ Error interno:', err);
  res.status(500).json({
    message: "Error interno del servidor.",
    error: String(err.message || err),
  });
});


// 🔥🔥🔥 ESTA ES LA PARTE QUE TE FALTABA 🔥🔥🔥
const PORT = process.env.PORT || 4017;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});


module.exports = app;