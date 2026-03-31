const express = require("express");
const { getProducts, getCategories } = require("../controllers/productController");

const router = express.Router();

router.post("/search", getProducts);
router.get("/categories", getCategories);

module.exports = router;