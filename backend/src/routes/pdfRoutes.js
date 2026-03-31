const express = require("express");
const { generatePdf } = require("../controllers/pdfController");

const router = express.Router();

router.post("/generate", generatePdf);

module.exports = router;