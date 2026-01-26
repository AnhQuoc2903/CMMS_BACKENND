const TenantRequest = require("../models/TenantRequest");
const WorkOrder = require("../models/WorkOrder");
const eventBus = require("../events/eventBus");

/* ======================================================
   TENANT SUBMIT
====================================================== */
exports.submitTenantRequest = async (req, res) => {
  const { title, description, tenantName, tenantEmail } = req.body;

  if (!title || !tenantName || !tenantEmail) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const tr = await TenantRequest.create({
    title,
    description,
    tenantName,
    tenantEmail,
    status: "SUBMITTED",
  });

  eventBus.emit("TENANT_REQUEST_SUBMITTED", {
    tenantRequest: tr,
  });

  res.json(tr);
};

/* ======================================================
   BUILDING APPROVE (ADMIN)
====================================================== */
exports.buildingApprove = async (req, res) => {
  const { note } = req.body;

  const tr = await TenantRequest.findById(req.params.id);
  if (!tr) return res.status(404).json({ message: "Tenant request not found" });

  // ✅ CHỈ SỬA DÒNG NÀY
  if (tr.status !== "SUBMITTED") {
    return res.status(400).json({ message: "Invalid status" });
  }

  tr.status = "BUILDING_APPROVED";
  tr.buildingApproval = {
    approvedBy: req.user.id,
    approvedAt: new Date(),
    note,
  };

  await tr.save();
  res.json(tr);
};

/* ======================================================
   MSP REVIEW (MANAGER)
====================================================== */
exports.mspReview = async (req, res) => {
  const { note } = req.body;

  const tr = await TenantRequest.findById(req.params.id);
  if (!tr) return res.status(404).json({ message: "Tenant request not found" });

  if (tr.status !== "BUILDING_APPROVED") {
    return res.status(400).json({ message: "Must be building approved first" });
  }

  tr.status = "MSP_REVIEWED";
  tr.mspReview = {
    reviewedBy: req.user.id,
    reviewedAt: new Date(),
    note,
  };

  await tr.save();
  res.json(tr);
};

/* ======================================================
   FINAL APPROVE → CREATE WORK ORDER (ADMIN)
====================================================== */
exports.finalApprove = async (req, res) => {
  const tr = await TenantRequest.findById(req.params.id);
  if (!tr) return res.status(404).json({ message: "Tenant request not found" });

  if (tr.status !== "MSP_REVIEWED") {
    return res.status(400).json({ message: "Must be MSP reviewed first" });
  }

  // ✅ CREATE WORK ORDER (CHỈ 1 CHỖ DUY NHẤT)
  const wo = await WorkOrder.create({
    title: tr.title,
    description: tr.description,
    createdBy: req.user.id,
    tenantRequest: tr._id,
    priority: "MEDIUM",
    status: "OPEN",
  });

  tr.status = "FINAL_APPROVED";
  tr.finalApproval = {
    approvedBy: req.user.id,
    approvedAt: new Date(),
  };
  tr.workOrder = wo._id;

  await tr.save();

  res.json({
    tenantRequest: tr,
    workOrder: wo,
  });
};

/* ======================================================
   REJECT (ADMIN / MANAGER)
====================================================== */
exports.rejectTenantRequest = async (req, res) => {
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: "Reject reason is required" });
  }

  const tr = await TenantRequest.findById(req.params.id);
  if (!tr) return res.status(404).json({ message: "Tenant request not found" });

  if (["FINAL_APPROVED", "REJECTED"].includes(tr.status)) {
    return res.status(400).json({ message: "Request already finalized" });
  }

  tr.status = "REJECTED";
  tr.rejectReason = reason;
  tr.handledBy = req.user.id;

  await tr.save();
  res.json(tr);
};

/* ======================================================
   LIST
====================================================== */
exports.getTenantRequests = async (req, res) => {
  const list = await TenantRequest.find()
    .populate("handledBy", "name email")
    .populate("workOrder")
    .sort({ createdAt: -1 });

  res.json(list);
};
