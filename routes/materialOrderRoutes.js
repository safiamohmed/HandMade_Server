const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const {
  createMaterialOrder,
  getMaterialOrders,
  getMaterialOrderById,
  updateMaterialOrderStatus,
} = require("../controller/materialOrderController");

router.use(protect);

router.route("/").post(createMaterialOrder).get(getMaterialOrders);
router.route("/:id").get(getMaterialOrderById);
router.patch("/:id/status", updateMaterialOrderStatus);

module.exports = router;
