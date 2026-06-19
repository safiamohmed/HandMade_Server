// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const { protect, restrictTo } = require("../middleware/auth.middleware");
const { getActivityLogs } = require("../controller/adminController");

router.use(protect, restrictTo("admin"));

router.get("/activity-logs", getActivityLogs);

module.exports = router;
