const express = require("express");
const router = express.Router();
const auth = require("../controller/auth.controller");

router.post("/signup", auth.signup);
router.post("/verify-otp", auth.verifyOTP);
router.post("/login", auth.login);
router.post("/forget-password", auth.forgetPassword);
router.post("/reset-password", auth.resetPassword);
router.post("/resend-otp", auth.resendOTP);
router.get("/google", auth.googleAuth);                    // زرار Google في الـ frontend
router.get("/google/callback", auth.googleCallback);   
module.exports = router;
