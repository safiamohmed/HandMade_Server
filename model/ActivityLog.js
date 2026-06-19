const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: String,
    userRole: String,
    action: { type: String, required: true },
    entity: String, // "order" | "product" | "material-order" | "user"
    entityId: String,
    details: String,
    ip: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("ActivityLog", activityLogSchema);
