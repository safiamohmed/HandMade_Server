const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const app = express();
const cors = require("./middleware/cors");
const connectDB = require("./config/database.config");
const passport = require("./config/passport.config");

const fs = require("fs");
const path = require("path");

connectDB();
app.use(cors);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

["uploads/products", "uploads/materials", "uploads/avatars"].forEach((dir) => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});
// ─── Static files (local avatar uploads in development) ──────────────────────
app.use("/uploads", express.static("uploads"));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth.route"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/profile", require("./routes/profile.route")); // ← NEW
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/materials", require("./routes/materialRoutes"));
app.use("/api/material-orders", require("./routes/materialOrderRoutes"));
app.use("/api/categories", require("./routes/category.routes"));

app.use("/api/dashboards", require("./routes/dashboards.route"));

// ─── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Multer file-size / type errors
  if (err.message && err.message.includes("Only JPEG")) {
    return res.status(400).json({ message: err.message });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "Image must be smaller than 2 MB" });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ message: err.message || "Internal server error" });
});

app.use(passport.initialize());

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server started at port ${port}`));
