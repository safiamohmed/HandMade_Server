const ActivityLog = require("../model/ActivityLog");

exports.getActivityLogs = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.role)   filter.userRole = req.query.role;
    if (req.query.entity) filter.entity   = req.query.entity;
    if (req.query.search) {
      filter.$or = [
        { userName: { $regex: req.query.search, $options: "i" } },
        { action:   { $regex: req.query.search, $options: "i" } },
        { details:  { $regex: req.query.search, $options: "i" } },
      ];
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name email shopName role"),
      ActivityLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: logs,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};