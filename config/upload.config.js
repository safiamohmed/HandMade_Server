// config/upload.config.js
// ─────────────────────────────────────────────────────────────────────────────
// Handles avatar uploads using multer + multer-storage-cloudinary.
// Falls back to local disk storage if CLOUDINARY_* env vars are not set.
// ─────────────────────────────────────────────────────────────────────────────

const multer = require("multer");
const path   = require("path");

// ── Option A: Cloudinary (recommended for production) ────────────────────────
let storage;

if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  const cloudinary               = require("cloudinary").v2;
  const { CloudinaryStorage }    = require("multer-storage-cloudinary");

  cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key    : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder        : "handmade/avatars",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation : [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
    },
  });
} else {
  // ── Option B: Local disk (development fallback) ─────────────────────────
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/avatars/"),
    filename:    (req, file, cb) => {
      const ext  = path.extname(file.originalname);
      const name = `avatar-${req.user.id}-${Date.now()}${ext}`;
      cb(null, name);
    },
  });
}

// ── File filter ──────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and WebP images are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max
});

module.exports = upload;