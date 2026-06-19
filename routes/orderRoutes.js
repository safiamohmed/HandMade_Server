const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getArtistOrders,
  updateOrderStatusByArtist,
} = require("../controller/orderController");
const { protect } = require("../middleware/auth.middleware");

router.use(protect);

// ✅ Static routes FIRST — قبل /:orderId
router.get("/artist-orders", getArtistOrders);
router.patch("/artist-orders/:orderId/status", updateOrderStatusByArtist);

// ✅ Generic routes AFTER
router.route("/").post(createOrder).get(getOrders);
router
  .route("/:orderId")
  .get(getOrderById)
  .put(updateOrderStatus)
  .delete(cancelOrder);

module.exports = router;
