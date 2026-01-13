const TenantRequest = require("../models/TenantRequest");
const WorkOrder = require("../models/WorkOrder");

// ===== APPROVE =====
exports.approveTenantRequest = async (req, res) => {
  const tr = await TenantRequest.findById(req.params.id);
  if (!tr) {
    return res.status(404).json({ message: "Tenant request not found" });
  }

  if (tr.status !== "OPEN") {
    return res
      .status(400)
      .json({ message: "Tenant request already processed" });
  }

  const userId = req.user.id; // 👈 QUAN TRỌNG
  if (!userId) {
    return res.status(401).json({ message: "Invalid user token" });
  }

  // ✅ Update TenantRequest
  tr.status = "APPROVED";
  tr.handledBy = userId;
  await tr.save();

  // ✅ Tạo WorkOrder
  const wo = await WorkOrder.create({
    title: tr.title,
    description: tr.description,
    createdBy: userId,
    tenantRequest: tr._id,
    status: "APPROVED",
    approval: {
      approvedBy: userId,
      approvedAt: new Date(),
    },
  });

  res.json({
    tenantRequest: tr,
    workOrder: wo,
  });
};

// ===== REJECT =====
exports.rejectTenantRequest = async (req, res) => {
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: "Reject reason is required" });
  }

  const tr = await TenantRequest.findById(req.params.id);
  if (!tr) {
    return res.status(404).json({ message: "Tenant request not found" });
  }

  if (tr.status !== "OPEN") {
    return res
      .status(400)
      .json({ message: "Tenant request already processed" });
  }

  tr.status = "REJECTED";
  tr.handledBy = req.user.id;
  tr.rejectReason = reason; // 👈 thêm field này
  await tr.save();

  res.json(tr);
};

exports.getTenantRequests = async (req, res) => {
  const list = await TenantRequest.find()
    .populate("handledBy", "name email")
    .sort({ createdAt: -1 });

  res.json(list);
};
