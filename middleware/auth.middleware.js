// middleware/auth.middleware.js
// ─────────────────────────────────────────────────────────────────────────────
// Verifies the JWT from the Authorization header and attaches req.user.
// ─────────────────────────────────────────────────────────────────────────────

const jwt = require("jsonwebtoken");
const User = require("../model/user.model");

exports.protect = async (req, res, next) => {
  try {
    // 1. Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "No token provided. Please log in." });
    }

    const token = authHeader.split(" ")[1];

    // 2. Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    // 3. Check user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    // 4. Attach to request
    req.user = { id: user._id, role: user.role, name: user.name };
    next();
  } catch (err) {
    res.status(500).json({ message: err.message || "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Role-based guard: restrictTo("admin")
// ─────────────────────────────────────────────────────────────────────────────
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "You do not have permission for this action." });
    }
    next();
  };
