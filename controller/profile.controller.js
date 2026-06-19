// controller/profile.controller.js
// ─────────────────────────────────────────────────────────────────────────────
// Handles all "Edit Profile" actions for every role:
//   • GET  /api/profile/me              → getProfile
//   • PUT  /api/profile/me              → updateProfile
//   • PUT  /api/profile/change-password → changePassword
//   • POST /api/profile/avatar          → uploadAvatar
// ─────────────────────────────────────────────────────────────────────────────

const User = require("../model/user.model");
const bcrypt = require("bcrypt");

// ─────────────────────────────────────────────────────────────────────────────
// Helper: pick only the allowed keys from req.body, ignoring everything else.
// ─────────────────────────────────────────────────────────────────────────────
const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

// ─── Allowed update fields per role ──────────────────────────────────────────
const ALLOWED_FIELDS = {
  customer: ["firstName", "lastName", "phone", "dateOfBirth"],
  artist: [
    "phone",
    "shopName",
    "bio",
    "craftCategory",
    "city",
    "instagramHandle",
  ],
  supplier: [
    "phone",
    "shopName",
    "bio",
    "craftCategory",
    "city",
    "instagramHandle",
  ],
  admin: ["firstName", "lastName", "phone", "department", "adminRoleLevel"],
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/profile/me
// Returns the logged-in user's full profile (no password).
// ─────────────────────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -otp -otpExpires",
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/profile/me
// Updates profile fields allowed for the user's role.
//
// Customer body example:
//   { firstName, lastName, phone, dateOfBirth }
//
// Artist / Supplier body example:
//   { phone, shopName, bio, craftCategory, city, instagramHandle }
//
// Admin body example:
//   { firstName, lastName, phone, department, adminRoleLevel }
// ─────────────────────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Only allow fields relevant to the user's role
    const allowed = ALLOWED_FIELDS[user.role] || [];
    const updates = pick(req.body, allowed);

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    // For customer: also build the combined `name` from firstName + lastName
    if (user.role === "customer") {
      const firstName = updates.firstName ?? user.firstName;
      const lastName = updates.lastName ?? user.lastName;
      if (firstName || lastName) {
        updates.name = `${firstName || ""} ${lastName || ""}`.trim();
      }
    }

    // For artist/supplier: shop name may also act as display name
    if (["artist", "supplier"].includes(user.role) && updates.shopName) {
      updates.name = updates.shopName;
    }

    Object.assign(user, updates);
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      message: "Profile updated successfully",
      user: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/profile/change-password
// Body: { currentPassword, newPassword, confirmPassword }
// ─────────────────────────────────────────────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message:
          "currentPassword, newPassword, and confirmPassword are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    const isCorrect = await user.correctPassword(currentPassword);
    if (!isCorrect) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword; // pre-save hook hashes it
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/profile/avatar
// Accepts a multipart/form-data file with field name "avatar".
// Multer middleware (in the route) handles the upload before this runs.
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // disk storage: req.file.path = "uploads/avatars/avatar-123.jpg" (no leading slash → broken)
    // Always build the path from req.file.filename to guarantee a correct absolute URL
    user.avatar = `/uploads/avatars/${req.file.filename}`;

    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      message: "Avatar updated successfully",
      avatar: user.avatar,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: strip sensitive fields before sending user object in response
// ─────────────────────────────────────────────────────────────────────────────
function sanitizeUser(user) {
  const obj = user.toObject();
  delete obj.password;
  delete obj.otp;
  delete obj.otpExpires;
  return obj;
}
