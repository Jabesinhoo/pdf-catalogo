const express = require("express");
const {
  getProducts,
  getCategories,
  getProductImage,
} = require("../controllers/productController");

const router = express.Router();

router.post("/search", getProducts);
router.get("/image", getProductImage);
router.get("/categories", getCategories);

module.exports = router;