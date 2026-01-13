// controllers/audit.controller.js
const AuditLog = require("../models/AuditLog");

exports.getTechnicianLogs = async (req, res) => {
  const logs = await AuditLog.find({ target: req.params.id })
    .populate("actor", "name email")
    .sort({ createdAt: -1 });

  res.json(logs);
};
