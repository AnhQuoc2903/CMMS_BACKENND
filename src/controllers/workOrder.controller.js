const mongoose = require("mongoose");
const PDFDocument = require("pdfkit");
const axios = require("axios");
const WorkOrder = require("../models/WorkOrder");
const cloudinary = require("cloudinary").v2;
const AssetLog = require("../models/AssetLog");
const Asset = require("../models/Asset");
const ChecklistTemplate = require("../models/ChecklistTemplate");
const WorkOrderHistory = require("../models/WorkOrderHistory");
const SparePart = require("../models/SparePart");
const User = require("../models/User");
const InventoryLog = require("../models/InventoryLog");
const { assignAssetsToWorkOrder } = require("../utils/assetAssign.util");

const PRIORITY_SLA = {
  CRITICAL: 2,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

async function releaseReservedInventory(workOrder, userId) {
  for (const item of workOrder.usedParts || []) {
    const spare = await SparePart.findById(item.part);
    if (!spare) continue;

    const before = spare.reservedQuantity || 0;

    spare.reservedQuantity = Math.max(
      spare.reservedQuantity - item.quantity,
      0,
    );

    await spare.save();

    await InventoryLog.create({
      sparePart: spare._id,
      type: "RELEASE",
      quantity: item.quantity,
      beforeQty: before,
      afterQty: spare.reservedQuantity,
      workOrder: workOrder._id,
      performedBy: userId,
    });
  }
}

async function reserveInventory(workOrder, userId) {
  for (const item of workOrder.usedParts || []) {
    const spare = await SparePart.findById(item.part);
    if (!spare) continue;

    const available = spare.quantity - (spare.reservedQuantity || 0);
    if (available < item.quantity) {
      throw new Error(`Not enough stock for ${spare.name}`);
    }

    const before = spare.reservedQuantity || 0;
    spare.reservedQuantity = before + item.quantity;
    await spare.save();

    await InventoryLog.create({
      sparePart: spare._id,
      type: "RESERVE",
      quantity: item.quantity,
      beforeQty: before,
      afterQty: spare.reservedQuantity,
      workOrder: workOrder._id,
      performedBy: userId,
    });
  }
}

async function consumeInventory(workOrder, userId, session) {
  for (const item of workOrder.usedParts || []) {
    const spare = await SparePart.findById(item.part).session(session);
    if (!spare) continue;

    const beforeQty = spare.quantity;
    const beforeReserved = spare.reservedQuantity || 0;

    spare.quantity = Math.max(spare.quantity - item.quantity, 0);
    spare.reservedQuantity = Math.max(beforeReserved - item.quantity, 0);

    await spare.save({ session });

    await InventoryLog.create(
      [
        {
          sparePart: spare._id,
          type: "OUT",
          quantity: item.quantity,
          beforeQty,
          afterQty: spare.quantity,
          workOrder: workOrder._id,
          performedBy: userId,
        },
      ],
      { session },
    );
  }
}

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

  const wo = await WorkOrder.findById(req.params.id).populate("usedParts.part");

  if (!wo) return res.status(404).json({ message: "Not found" });

  // ❗ Chỉ cho đổi khi WO CHƯA CHẠY
  if (
    ["IN_PROGRESS", "COMPLETED", "REVIEWED", "VERIFIED", "CLOSED"].includes(
      wo.status,
    )
  ) {
    return res.status(400).json({
      message: "Cannot change priority after work has started",
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
// controllers/workOrder.controller.js

exports.getDetail = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id)
    .populate("assignedAssets", "name code status")
    .populate("assignedTechnicians", "name email status")
    .populate(
      "usedParts.part",
      "name quantity reservedQuantity status", // ✅ QUAN TRỌNG
    )
    .populate("maintenancePlan", "name frequency");

  if (!wo) {
    return res.status(404).json({ message: "Work order not found" });
  }

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

  // ✅ chỉ ACTIVE technician
  const activeTechs = await User.find({
    _id: { $in: technicians },
    status: "ACTIVE",
  });

  if (activeTechs.length !== technicians.length) {
    return res.status(400).json({
      message: "One or more technicians are INACTIVE",
    });
  }

  wo.assignedTechnicians = activeTechs.map((t) => t._id);

  // ✅ auto apply checklist
  if (!wo.checklist || wo.checklist.length === 0) {
    const template = await ChecklistTemplate.findOne({ isActive: true });
    if (template) {
      wo.checklist = template.items.map((i) => ({
        title: i.title,
        isDone: false,
      }));
      wo.checklistTemplate = {
        templateId: template._id,
        name: template.name,
      };
    }
  }

  // ✅ update status
  const isFullyAssigned =
    wo.assignedTechnicians.length > 0 && wo.assignedAssets.length > 0;

  wo.status = isFullyAssigned ? "ASSIGNED" : "APPROVED";

  await wo.save();

  const populated = await WorkOrder.findById(wo._id).populate(
    "assignedTechnicians",
    "name email status",
  );

  res.json(populated);
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

  // ✅ check AVAILABLE (giữ nguyên)
  for (const assetId of assets) {
    const asset = await Asset.findById(assetId);
    if (!asset || asset.status !== "AVAILABLE") {
      return res.status(400).json({ message: "Asset not available" });
    }
  }

  // ✅ gán vào WO
  wo.assignedAssets = assets;

  const isFullyAssigned =
    wo.assignedAssets.length > 0 && wo.assignedTechnicians.length > 0;

  wo.status = isFullyAssigned ? "ASSIGNED" : "APPROVED";
  await wo.save();

  // 🔥 CHỈ GỌI 1 CHỖ DUY NHẤT
  await assignAssetsToWorkOrder({
    assetIds: assets,
    workOrderId: wo._id,
    action: "ASSIGNED",
    note: "Assigned manually",
  });

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

  // 5️⃣ OK → START
  wo.status = "IN_PROGRESS";
  await wo.save();

  res.json(wo);
};

/* ======================================================
   CHECKLIST
====================================================== */
exports.updateChecklist = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id).populate(
    "assignedTechnicians",
    "status",
  );

  if (!wo) return res.status(404).json({ message: "Not found" });

  if (wo.status !== "IN_PROGRESS") {
    return res.status(400).json({ message: "Not in progress" });
  }

  // 🔐 check technician
  const tech = wo.assignedTechnicians.find(
    (t) => t._id.toString() === req.user.id,
  );

  if (!tech) {
    return res.status(403).json({ message: "Not assigned" });
  }

  if (tech.status !== "ACTIVE") {
    return res.status(403).json({
      message: "Inactive technician cannot update checklist",
    });
  }

  // 🔥 CHECK TEMPLATE STATUS
  if (wo.checklistTemplate?.templateId) {
    const tpl = await ChecklistTemplate.findById(
      wo.checklistTemplate.templateId,
    );

    if (!tpl || !tpl.isActive) {
      return res.status(403).json({
        message: "Checklist template is inactive. Checklist is locked.",
      });
    }
  }

  // payload check
  if (!Array.isArray(req.body.checklist)) {
    return res.status(400).json({ message: "Invalid checklist payload" });
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
    (t) => t.toString() === req.user.id,
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
    (t) => t.toString() === req.user.id,
  );
  if (!isAssigned) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const upload = await cloudinary.uploader.upload(signature, {
    folder: "cmms/signatures",
  });

  // ✅ CHỈ LƯU SIGNATURE + ĐỔI STATUS
  wo.signature = { url: upload.secure_url };
  wo.completedAt = new Date();
  wo.status = "COMPLETED";

  await wo.save();
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

  // 🔁 TRẢ ASSET VỀ AVAILABLE
  for (const assetId of wo.assignedAssets) {
    await Asset.findByIdAndUpdate(assetId, {
      status: "AVAILABLE",
    });

    await AssetLog.create({
      asset: assetId,
      workOrder: wo._id,
      action: "AVAILABLE",
      performedBy: req.user.id,
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
    .populate("assignedTechnicians", "name email status")
    .populate("assignedAssets", "name code status")
    .populate("usedParts.part", "name sku");

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
    `attachment; filename=work-order-${wo._id}.pdf`,
  );

  doc.pipe(res);

  /* ========= HELPERS ========= */
  const sectionTitle = (title) => {
    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(13).text(title);
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(11);
  };

  /* ========= HEADER ========= */
  doc.font("Helvetica-Bold").fontSize(18).text("WORK ORDER", {
    align: "center",
  });
  doc.moveDown();

  doc.font("Helvetica").fontSize(12);
  doc.text(`Title: ${wo.title}`);
  doc.text(`Description: ${wo.description || "-"}`);
  doc.text(`Status: ${wo.status}`);
  doc.text(
    `Completed At: ${
      wo.completedAt ? new Date(wo.completedAt).toLocaleString() : "-"
    }`,
  );

  doc.moveDown();
  doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

  /* ========= TECHNICIANS ========= */
  sectionTitle("Technicians");

  if (!wo.assignedTechnicians.length) {
    doc.text("- None");
  } else {
    wo.assignedTechnicians.forEach((t) => {
      doc.text(`• ${t.name} (${t.email})`, { indent: 15 });
    });
  }

  /* ========= SPARE PARTS ========= */
  sectionTitle("Spare Parts Used");

  if (!wo.usedParts?.length) {
    doc.text("- None");
  } else {
    wo.usedParts.forEach((u) => {
      doc.text(`• ${u.part?.name || "Unknown"}  x${u.quantity}`, {
        indent: 15,
      });
    });
  }

  /* ========= ASSETS ========= */
  sectionTitle("Assets");

  if (!wo.assignedAssets.length) {
    doc.text("- None");
  } else {
    wo.assignedAssets.forEach((a) => {
      doc.text(`• ${a.name} (${a.code})`, { indent: 15 });
    });
  }

  /* ========= CHECKLIST ========= */
  sectionTitle("Checklist");

  if (!wo.checklist?.length) {
    doc.text("- None");
  } else {
    wo.checklist.forEach((c) => {
      doc.text(`${c.isDone ? "☑" : "☐"} ${c.title}`, {
        indent: 15,
      });
    });
  }

  /* ========= PHOTOS ========= */
  if (wo.photos?.length) {
    sectionTitle("Photos");

    let x = 40;
    let y = doc.y;
    const size = 160;

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

  /* ========= SIGNATURE (BÊN PHẢI – CÙNG TRANG) ========= */
  if (wo.signature?.url) {
    const sigX = 350;
    const sigY = 120;

    doc.font("Helvetica-Bold").fontSize(13).text("Signature", sigX, sigY);

    const sigImg = await axios
      .get(wo.signature.url, { responseType: "arraybuffer" })
      .then((r) => r.data);

    doc.image(sigImg, sigX, sigY + 20, {
      width: 180,
    });

    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        `Signed at: ${
          wo.completedAt ? new Date(wo.completedAt).toLocaleString() : "-"
        }`,
        sigX,
        sigY + 110,
      );

    // đường kẻ chia cột (optional, nhìn rất đẹp)
    doc
      .moveTo(330, 100)
      .lineTo(330, doc.page.height - 50)
      .stroke();
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
    title: item.title,
    isDone: false,
  }));

  wo.checklistTemplate = {
    templateId: template._id,
    name: template.name,
  };

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wo = await WorkOrder.findById(req.params.id).session(session);
    if (!wo) throw new Error("Not found");

    if (wo.status !== "REVIEWED") {
      throw new Error("Not reviewed yet");
    }

    // ✅ CHỈ TẠI VERIFY MỚI TRỪ KHO
    await consumeInventory(wo, req.user.id, session);

    wo.status = "VERIFIED";
    wo.verification = {
      verifiedBy: req.user.id,
      verifiedAt: new Date(),
    };

    await wo.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json(wo);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message });
  }
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

  // ✅ CHỈ RELEASE (CHƯA HỀ OUT)
  await releaseReservedInventory(wo, req.user.id);

  wo.status = "IN_PROGRESS";
  wo.signature = undefined;
  wo.verification = undefined;

  wo.reviewRejections.push({
    rejectedBy: req.user.id,
    rejectedAt: new Date(),
    reason,
  });

  await WorkOrderHistory.create({
    workOrder: wo._id,
    action: "REWORK",
    performedBy: req.user.id,
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

  // ❌ KHÔNG RELEASE INVENTORY (đã OUT rồi)

  wo.status = "IN_PROGRESS";
  wo.signature = undefined;

  wo.verificationRejections.push({
    rejectedBy: req.user.id,
    rejectedAt: new Date(),
    reason,
  });

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
    (t) => t.toString() === req.user.id,
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

exports.updateUsedParts = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { usedParts } = req.body;

    const wo = await WorkOrder.findById(req.params.id).session(session);
    if (!wo) throw new Error("Work order not found");

    if (wo.status !== "IN_PROGRESS") {
      throw new Error(
        "Spare parts can only be modified while work is in progress",
      );
    }

    // OLD & NEW MAP
    const oldMap = new Map();
    (wo.usedParts || []).forEach((u) =>
      oldMap.set(u.part.toString(), u.quantity),
    );

    const newMap = new Map();
    usedParts.forEach((u) => newMap.set(u.part.toString(), u.quantity));

    const allPartIds = new Set([...oldMap.keys(), ...newMap.keys()]);

    for (const partId of allPartIds) {
      const oldQty = oldMap.get(partId) || 0;
      const newQty = newMap.get(partId) || 0;
      const diff = newQty - oldQty;

      if (diff === 0) continue;

      const part = await SparePart.findById(partId).session(session);
      if (!part) throw new Error("Spare part not found");

      const before = part.reservedQuantity || 0;

      if (diff > 0) {
        const available = part.quantity - before;
        if (available < diff) {
          throw new Error(`Not enough stock for ${part.name}`);
        }
        part.reservedQuantity += diff;

        await InventoryLog.create(
          [
            {
              sparePart: part._id,
              type: "RESERVE",
              quantity: diff,
              beforeQty: before,
              afterQty: part.reservedQuantity,
              workOrder: wo._id,
              performedBy: req.user.id,
            },
          ],
          { session },
        );
      }

      if (diff < 0) {
        part.reservedQuantity = Math.max(before + diff, 0);

        await InventoryLog.create(
          [
            {
              sparePart: part._id,
              type: "RELEASE",
              quantity: Math.abs(diff),
              beforeQty: before,
              afterQty: part.reservedQuantity,
              workOrder: wo._id,
              performedBy: req.user.id,
            },
          ],
          { session },
        );
      }

      await part.save({ session });
    }

    wo.usedParts = usedParts.map((u) => ({
      part: u.part,
      quantity: u.quantity,
    }));

    await wo.save({ session });

    await session.commitTransaction();
    session.endSession();

    const populated = await WorkOrder.findById(wo._id).populate(
      "usedParts.part",
      "name quantity reservedQuantity status",
    );

    res.json(populated);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message });
  }
};

exports.cancelWorkOrder = async (req, res) => {
  const { reason } = req.body;

  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (["CLOSED", "CANCELLED"].includes(wo.status)) {
    return res.status(400).json({ message: "Cannot cancel" });
  }

  // 🔁 1. ROLLBACK INVENTORY (nếu đã xuất kho)
  if (
    ["OPEN", "APPROVED", "ASSIGNED", "IN_PROGRESS", "REVIEWED"].includes(
      wo.status,
    )
  ) {
    await releaseReservedInventory(wo, req.user.id);
  }

  // 🔁 2. TRẢ ASSET VỀ AVAILABLE
  for (const assetId of wo.assignedAssets || []) {
    await Asset.findByIdAndUpdate(assetId, { status: "AVAILABLE" });

    await AssetLog.create({
      asset: assetId,
      workOrder: wo._id,
      action: "AVAILABLE",
      performedBy: req.user.id,
    });
  }

  // 🧾 3. GHI WORK ORDER HISTORY
  await WorkOrderHistory.create({
    workOrder: wo._id,
    action: "CANCEL",
    note: reason,
    performedBy: req.user.id,
  });

  // ❌ 4. UPDATE WORK ORDER
  wo.status = "CANCELLED";
  wo.cancelReason = reason;
  wo.cancelledAt = new Date();
  wo.cancelledBy = req.user.id;

  await wo.save();
  res.json(wo);
};

exports.holdWorkOrder = async (req, res) => {
  const { reason } = req.body;

  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) return res.status(404).json({ message: "Not found" });

  if (!["ASSIGNED", "IN_PROGRESS"].includes(wo.status)) {
    return res.status(400).json({ message: "Cannot hold" });
  }

  wo.status = "ON_HOLD";
  wo.holdReason = reason;
  wo.holdAt = new Date();

  wo.slaPausedAt = new Date();

  // 🧾 AUDIT TIMELINE
  await WorkOrderHistory.create({
    workOrder: wo._id,
    action: "HOLD",
    note: reason,
    performedBy: req.user.id,
  });

  await wo.save();
  res.json(wo);
};

exports.resumeWorkOrder = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);

  if (wo.status !== "ON_HOLD") {
    return res.status(400).json({ message: "Not on hold" });
  }

  wo.status = "IN_PROGRESS";

  if (wo.slaPausedAt && wo.dueAt) {
    const pausedMs = Date.now() - wo.slaPausedAt.getTime();

    wo.slaPausedTotal = (wo.slaPausedTotal || 0) + pausedMs;
    wo.slaPausedAt = null;

    wo.dueAt = new Date(wo.dueAt.getTime() + pausedMs);
  }
  // 🧾 AUDIT
  await WorkOrderHistory.create({
    workOrder: wo._id,
    action: "RESUME",
    note: "Work resumed",
    performedBy: req.user.id,
  });

  await wo.save();
  res.json(wo);
};
