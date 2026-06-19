const express = require("express");
const router = express.Router();

const { productUpload } = require("../config/catalogUpload.config");

const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
  updateReview,
  deleteReview,
  getMyProducts,
  getMyReviews,
  getGiftRecommendations,
} = require("../controller/productController");

const { protect } = require("../middleware/auth.middleware");

// =====================
// Public routes
// =====================
router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/recommendations", getGiftRecommendations);

// =====================
// Protected routes
// =====================
router.get("/my-products", protect, getMyProducts);
router.get("/my-reviews", protect, getMyReviews);

router.post("/", protect, productUpload.single("image"), createProduct);
router.put("/:id", protect, productUpload.single("image"), updateProduct);

router.delete("/:id", protect, deleteProduct);

// =====================
// Reviews
// =====================
router.post("/:id/reviews", protect, addReview);
router.put("/:productId/reviews/:reviewId", protect, updateReview);
router.delete("/:productId/reviews/:reviewId", protect, deleteReview);

module.exports = router;
