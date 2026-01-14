const PDFDocument = require("pdfkit");
const axios = require("axios");
const WorkOrder = require("../models/WorkOrder");
const cloudinary = require("cloudinary").v2;
const AssetLog = require("../models/AssetLog");
const Asset = require("../models/Asset");
const mongoose = require("mongoose");
const ChecklistTemplate = require("../models/ChecklistTemplate");
const WorkOrderHistory = require("../models/WorkOrderHistory");

const PRIORITY_SLA = {
  CRITICAL: 2,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};
/* ======================================================
   GET ALL
====================================================== */
exports.getAll = async (req, res) => {
  const { role, id } = req.user;
  let query = {};

  if (role === "TECHNICIAN") {
    query = {
      assignedTechnicians: id,
      status: { $in: ["ASSIGNED", "IN_PROGRESS"] },
    };
  }

  const data = await WorkOrder.find(query).sort({ createdAt: -1 });
  res.json(data);
};

/* ======================================================
   CREATE
====================================================== */
exports.create = async (req, res) => {
  const priority = req.body.priority || "MEDIUM";
  const slaHours = PRIORITY_SLA[priority];

  const wo = await WorkOrder.create({
    ...req.body,
    priority,
    slaHours,
    dueAt: new Date(Date.now() + slaHours * 60 * 60 * 1000),
    createdBy: req.user.id,
    status: "OPEN",
  });

  res.json(wo);
};

/* ======================================================
   UPDATE PRIORITY
====================================================== */
exports.updatePriority = async (req, res) => {
  const { priority } = req.body;

  if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(priority)) {
    return res.status(400).json({ message: "Invalid priority" });
  }

  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  // ❗ Chỉ cho đổi khi WO CHƯA CHẠY
  if (!["OPEN", "PENDING_APPROVAL", "APPROVED"].includes(wo.status)) {
    return res.status(400).json({
      message: "Cannot change priority at this stage",
    });
  }

  const slaHours = PRIORITY_SLA[priority];

  wo.priority = priority;
  wo.slaHours = slaHours;
  wo.dueAt = new Date(Date.now() + slaHours * 60 * 60 * 1000);

  await wo.save();
  res.json(wo);
};

/* ======================================================
   GET DETAIL
====================================================== */
exports.getDetail = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id)
    .populate("assignedAssets", "name code status")
    .populate("assignedTechnicians", "name email");

  if (!wo) return res.status(404).json({ message: "Work order not found" });
  res.json(wo);
};

/* ======================================================
   SUBMIT / APPROVE / REJECT
====================================================== */
exports.submitForApproval = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (!["OPEN", "REJECTED"].includes(wo.status)) {
    return res.status(400).json({ message: "Cannot submit" });
  }

  wo.status = "PENDING_APPROVAL";
  await wo.save();
  res.json(wo);
};

exports.approveWorkOrder = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (wo.status !== "PENDING_APPROVAL") {
    return res.status(400).json({ message: "Not pending approval" });
  }

  wo.status = "APPROVED";
  wo.approval = {
    approvedBy: req.user.id,
    approvedAt: new Date(),
  };

  await wo.save();
  res.json(wo);
};

exports.rejectWorkOrder = async (req, res) => {
  const { reason } = req.body;
  if (!reason) {
    return res.status(400).json({ message: "Reject reason required" });
  }

  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (wo.status !== "PENDING_APPROVAL") {
    return res.status(400).json({ message: "Cannot reject" });
  }

  wo.status = "REJECTED";
  wo.approval = {
    rejectedBy: req.user.id,
    rejectedAt: new Date(),
    rejectReason: reason,
  };

  await wo.save();
  res.json(wo);
};

/* ======================================================
   ASSIGN TECHNICIANS
====================================================== */
exports.assignTechnicians = async (req, res) => {
  const { technicians } = req.body;

  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) {
    return res.status(404).json({ message: "Work order not found" });
  }

  if (!["APPROVED", "ASSIGNED"].includes(wo.status)) {
    return res.status(400).json({
      message: "Cannot assign technician at this stage",
    });
  }

  const template = await ChecklistTemplate.findOne({
    isActive: true,
  });

  if (template && wo.checklist.length === 0) {
    wo.checklist = template.items.map((i) => ({
      title: i.title,
      isDone: false,
    }));
  }

  // ✅ ÉP KIỂU ObjectId (QUAN TRỌNG NHẤT)
  wo.assignedTechnicians = technicians.map(
    (id) => new mongoose.Types.ObjectId(id)
  );

  await wo.save();
  res.json(wo);
};
/* ======================================================
   ASSIGN ASSETS
====================================================== */
exports.assignAssets = async (req, res) => {
  const { assets } = req.body;
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (!["APPROVED", "ASSIGNED"].includes(wo.status)) {
    return res.status(400).json({ message: "Cannot assign" });
  }

  for (const assetId of assets) {
    const asset = await Asset.findById(assetId);
    if (!asset || asset.status !== "AVAILABLE") {
      return res.status(400).json({ message: "Asset not available" });
    }
  }

  wo.assignedAssets = assets;

  const isFullyAssigned =
    wo.assignedAssets.length > 0 && wo.assignedTechnicians.length > 0;

  wo.status = isFullyAssigned ? "ASSIGNED" : "APPROVED";
  await wo.save();

  for (const assetId of assets) {
    await Asset.findByIdAndUpdate(assetId, { status: "IN_USE" });
    await AssetLog.create({
      asset: assetId,
      workOrder: wo._id,
      action: "ASSIGNED",
    });
  }

  res.json(wo);
};

/* ======================================================
   START WORK
====================================================== */
exports.startWorkOrder = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);

  if (!wo) {
    return res.status(404).json({ message: "Work order not found" });
  }

  // 1️⃣ Chỉ start khi ASSIGNED
  if (wo.status !== "ASSIGNED") {
    return res.status(400).json({ message: "Work order is not assigned" });
  }

  // 2️⃣ BẮT BUỘC: có ≥ 1 technician
  if (!wo.assignedTechnicians || wo.assignedTechnicians.length === 0) {
    return res.status(400).json({
      message: "At least one technician must be assigned before starting work",
    });
  }

  // 3️⃣ BẮT BUỘC: có checklist
  if (!wo.checklist || wo.checklist.length === 0) {
    return res.status(400).json({
      message: "Checklist is required before starting work",
    });
  }

  // 4️⃣ KHUYẾN NGHỊ: có ≥ 1 asset
  if (!wo.assignedAssets || wo.assignedAssets.length === 0) {
    return res.status(400).json({
      message: "At least one asset should be assigned before starting work",
    });
  }

  // trong startWorkOrder
  await WorkOrderHistory.create({
    workOrder: wo._id,
    action: "START",
    performedBy: req.user.id,
  });

  // 5️⃣ OK → START
  wo.status = "IN_PROGRESS";
  await wo.save();

  res.json(wo);
};

/* ======================================================
   CHECKLIST
====================================================== */
exports.updateChecklist = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (wo.status !== "IN_PROGRESS") {
    return res.status(400).json({ message: "Not in progress" });
  }

  const isAssigned = wo.assignedTechnicians.some(
    (t) => t.toString() === req.user.id
  );

  if (req.user.role !== "TECHNICIAN" || !isAssigned) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (!Array.isArray(req.body.checklist)) {
    return res.status(400).json({ message: "Invalid checklist payload" });
  }

  if (req.body.checklist.length !== wo.checklist.length) {
    return res.status(400).json({
      message: "Checklist length mismatch",
    });
  }

  wo.checklist = req.body.checklist;
  await wo.save();
  res.json(wo);
};

/* ======================================================
   UPLOAD PHOTO
====================================================== */
exports.uploadPhoto = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (wo.status !== "IN_PROGRESS") {
    return res.status(400).json({ message: "Not in progress" });
  }

  const isAssigned = wo.assignedTechnicians.some(
    (t) => t.toString() === req.user.id
  );

  if (req.user.role !== "TECHNICIAN" || !isAssigned) {
    return res.status(403).json({ message: "Forbidden" });
  }

  wo.photos.push({ url: req.file.path });

  await wo.save();
  res.json({ success: true });
};

/* ======================================================
   SIGNATURE → COMPLETED
====================================================== */
exports.uploadSignature = async (req, res) => {
  const { signature } = req.body;
  if (!signature) {
    return res.status(400).json({ message: "No signature" });
  }

  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (wo.status !== "IN_PROGRESS") {
    return res.status(400).json({ message: "Not in progress" });
  }

  const isAssigned = wo.assignedTechnicians.some(
    (t) => t.toString() === req.user.id
  );

  if (!isAssigned) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const upload = await cloudinary.uploader.upload(signature, {
    folder: "cmms/signatures",
  });

  wo.signature = { url: upload.secure_url };
  wo.status = "COMPLETED";
  wo.completedAt = new Date();
  await wo.save();

  for (const assetId of wo.assignedAssets) {
    await Asset.findByIdAndUpdate(assetId, { status: "MAINTENANCE" });
    await AssetLog.create({
      asset: assetId,
      workOrder: wo._id,
      action: "MAINTAINED",
    });
  }

  res.json(wo);
};

/* ======================================================
   CLOSE
====================================================== */
exports.closeWorkOrder = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (wo.status !== "VERIFIED") {
    return res.status(400).json({
      message: "Work order must be VERIFIED before closing",
    });
  }

  wo.status = "CLOSED";
  wo.closedBy = req.user.id;
  wo.closedAt = new Date();
  await wo.save();

  res.json(wo);
};

exports.exportPDF = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id)
    .populate("assignedAssets", "name code")
    .populate("assignedTechnicians", "name email");

  if (!wo) {
    return res.status(404).json({ message: "Work order not found" });
  }

  if (!["COMPLETED", "VERIFIED", "CLOSED"].includes(wo.status)) {
    return res.status(400).json({
      message: "PDF is only available after completion",
    });
  }

  const doc = new PDFDocument({ margin: 40 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=work-order-${wo._id}.pdf`
  );

  doc.pipe(res);

  /* ===== HEADER ===== */
  doc.fontSize(18).text("WORK ORDER", { align: "center" });
  doc.moveDown();

  doc.fontSize(12);
  doc.text(`Title: ${wo.title}`);
  doc.text(`Description: ${wo.description || "-"}`);
  doc.text(`Status: ${wo.status}`);
  doc.text(`Completed At: ${wo.completedAt || "-"}`);
  doc.moveDown();

  doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  /* ===== TECHNICIANS ===== */
  doc.fontSize(14).text("Technicians");
  doc.moveDown(0.5);

  if (!wo.assignedTechnicians.length) {
    doc.fontSize(11).text("- None");
  } else {
    wo.assignedTechnicians.forEach((t) => {
      doc.fontSize(11).text(`- ${t.name} (${t.email})`, {
        indent: 20,
      });
    });
  }

  doc.moveDown();

  /* ===== ASSETS ===== */
  doc.fontSize(14).text("Assets");
  doc.moveDown(0.5);

  if (!wo.assignedAssets.length) {
    doc.fontSize(11).text("- None");
  } else {
    wo.assignedAssets.forEach((a) => {
      doc.fontSize(11).text(`- ${a.name} (${a.code})`, {
        indent: 20,
      });
    });
  }

  doc.moveDown();

  /* ===== CHECKLIST ===== */
  doc.fontSize(14).text("Checklist");
  doc.moveDown(0.5);

  if (!wo.checklist.length) {
    doc.fontSize(11).text("- No checklist items");
  } else {
    wo.checklist.forEach((c) => {
      doc.fontSize(11).text(`${c.isDone ? "☑" : "☐"} ${c.title}`, {
        indent: 20,
      });
    });
  }

  doc.moveDown();

  /* ===== PHOTOS ===== */
  if (wo.photos?.length) {
    doc.fontSize(14).text("Photos");
    doc.moveDown(0.5);

    let x = 40;
    let y = doc.y;
    const size = 180;

    for (const p of wo.photos) {
      const img = await axios
        .get(p.url, { responseType: "arraybuffer" })
        .then((r) => r.data);

      doc.image(img, x, y, { width: size });

      x += size + 10;
      if (x > 350) {
        x = 40;
        y += size + 10;
      }
    }

    doc.y = y + size + 20;
  }

  /* ===== SIGNATURE ===== */
  if (wo.signature?.url) {
    doc.addPage();
    doc.fontSize(14).text("Signature");
    doc.moveDown();

    const sig = await axios
      .get(wo.signature.url, { responseType: "arraybuffer" })
      .then((r) => r.data);

    doc.image(sig, { width: 250 });
  }

  doc.end();
};

exports.applyChecklistTemplate = async (req, res) => {
  const { templateId } = req.body;

  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (wo.status !== "APPROVED") {
    return res.status(400).json({ message: "Invalid status" });
  }

  const template = await ChecklistTemplate.findById(templateId);
  if (!template) {
    return res.status(404).json({ message: "Template not found" });
  }

  // ✅ QUAN TRỌNG NHẤT
  wo.checklist = template.items.map((item) => ({
    title: item.title, // ← BẮT BUỘC
    isDone: false,
  }));

  await wo.save();
  res.json(wo);
};

exports.reviewWorkOrder = async (req, res) => {
  const { note } = req.body;

  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (wo.status !== "COMPLETED") {
    return res.status(400).json({ message: "Not completed yet" });
  }

  wo.status = "REVIEWED";
  wo.review = {
    reviewedBy: req.user.id,
    reviewedAt: new Date(),
    note,
  };

  await wo.save();
  res.json(wo);
};

exports.verifyWorkOrder = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (wo.status !== "REVIEWED") {
    return res.status(400).json({ message: "Not reviewed yet" });
  }

  wo.status = "VERIFIED";
  wo.verification = {
    verifiedBy: req.user.id,
    verifiedAt: new Date(),
  };

  await wo.save();
  res.json(wo);
};

exports.rejectReview = async (req, res) => {
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ message: "Reject reason required" });
  }

  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (wo.status !== "REVIEWED") {
    return res.status(400).json({ message: "Not reviewed yet" });
  }

  wo.status = "IN_PROGRESS";
  wo.reviewRejections.push({
    rejectedBy: req.user.id,
    rejectedAt: new Date(),
    reason,
  });

  // ❗ reset signature để bắt ký lại
  wo.signature = undefined;

  await WorkOrderHistory.create({
    workOrder: wo._id,
    action: "REWORK",
    performedBy: req.user.id, // hoặc từng tech nếu nhiều
    note: reason,
  });

  await wo.save();
  res.json(wo);
};

exports.rejectVerification = async (req, res) => {
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ message: "Reject reason required" });
  }

  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (wo.status !== "VERIFIED") {
    return res.status(400).json({ message: "Not verified yet" });
  }

  wo.status = "IN_PROGRESS";
  wo.verificationRejections.push({
    rejectedBy: req.user.id,
    rejectedAt: new Date(),
    reason,
  });

  wo.signature = undefined;

  await WorkOrderHistory.create({
    workOrder: wo._id,
    action: "REWORK",
    performedBy: req.user.id,
    note: reason,
  });

  await wo.save();
  res.json(wo);
};

exports.getMyWorkOrderHistory = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  // 🔐 chỉ technician được assign mới xem
  const isAssigned = wo.assignedTechnicians.some(
    (t) => t.toString() === req.user.id
  );

  if (!isAssigned) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const history = await WorkOrderHistory.find({
    workOrder: wo._id,
    $or: [{ performedBy: req.user.id }, { action: "REWORK" }],
  })
    .populate("performedBy", "name role email")
    .sort({ createdAt: -1 });

  res.json(history);
};
