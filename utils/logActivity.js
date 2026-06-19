const ActivityLog = require("../model/ActivityLog");

async function logActivity({ user, action, entity, entityId, details, ip }) {
  try {
    await ActivityLog.create({
      user: user?._id ?? user?.id,
      userName: user?.shopName || user?.name || user?.email || "Unknown",
      userRole: user?.role || "unknown",
      action,
      entity,
      entityId: entityId ? String(entityId) : undefined,
      details,
      ip,
    });
  } catch (err) {
    // لو فشل الـ log ما نوقفش الـ request
    console.error("Activity log error:", err.message);
  }
}

module.exports = logActivity;
