const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
  name: String,

  email: {
    type: String,
    unique: true,
    required: true,
  },

  password: {
    type: String,
    required: true,
    select: false,
  },

  otp: String,
  otpExpires: Date,

  isVerified: {
    type: Boolean,
    default: false,
  },

  role: {
    type: String,
    enum: ["customer", "artist", "supplier", "admin"],
    default: "customer",
  },

  // ─── Shared Profile Fields ─────────────────────────────────────
  avatar: {
    type: String,
    default: null,
  },

  phone: {
    type: String,
    default: null,
  },

  // ─── Customer-specific ────────────────────────────────────────
  firstName: String,
  lastName: String,
  dateOfBirth: Date,

  // ─── Artist / Supplier – Shop Info ────────────────────────────
  shopName: String,

  bio: {
    type: String,
    maxlength: 500,
  },

  craftCategory: String, // e.g. "Ceramics & Pottery"
  city: String,
  instagramHandle: String,

  // ─── Admin ────────────────────────────────────────────────────
  department: String,
  adminRoleLevel: {
    type: String,
    enum: ["Super Admin", "Moderator", "Support"],
    default: "Support",
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ─── Hooks ──────────────────────────────────────────────────────
userSchema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  this.updatedAt = Date.now();
});

// ─── Methods ────────────────────────────────────────────────────
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = crypto.createHash("sha256").update(otp).digest("hex");
  this.otpExpires = Date.now() + 10 * 60 * 1000;
  return otp;
};

userSchema.methods.correctPassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
