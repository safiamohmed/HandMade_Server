// routes/profile.route.js
// ─────────────────────────────────────────────────────────────────────────────
// All routes require a valid JWT  →  Authorization: Bearer <token>
// ─────────────────────────────────────────────────────────────────────────────

const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth.middleware");
const profile = require("../controller/profile.controller");
const upload = require("../config/upload.config");

// All profile routes are protected
router.use(protect);

// ── Get current user profile ─────────────────────────────────────────────────
router.get("/me", profile.getProfile);

// ── Update profile info ──────────────────────────────────────────────────────
router.put("/me", profile.updateProfile);

// ── Change password ───────────────────────────────────────────────────────────
router.put("/change-password", profile.changePassword);

// ── Upload / replace avatar ───────────────────────────────────────────────────
// "avatar" must match the FormData field name in the frontend
router.post("/avatar", upload.single("avatar"), profile.uploadAvatar);

module.exports = router;
