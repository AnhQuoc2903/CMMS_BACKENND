const WorkOrder = require("../models/WorkOrder");
const cloudinary = require("cloudinary").v2;
const PDFDocument = require("pdfkit");
const axios = require("axios");
const AssetLog = require("../models/AssetLog");
const Asset = require("../models/Asset");

exports.getAll = async (req, res) => {
  const data = await WorkOrder.find().sort({ createdAt: -1 });
  res.json(data);
};

exports.create = (req, res) =>
  WorkOrder.create({
    ...req.body,
    createdBy: req.user.id,
  }).then((r) => res.json(r));

exports.uploadPhoto = async (req, res) => {
  try {
    console.log("REQ FILE 👉", req.file); // 👈 thêm dòng này

    if (!req.file) {
      return res.status(400).json({ message: "Upload failed" });
    }

    const wo = await WorkOrder.findById(req.params.id);
    if (!wo) {
      return res.status(404).json({ message: "Work order not found" });
    }

    const photo = { url: req.file.path };
    wo.photos.push(photo);

    await wo.save();

    res.json({
      success: true,
      photo,
      photos: wo.photos,
    });
  } catch (e) {
    console.error("UPLOAD PHOTO ERROR 👉", e);
    res.status(500).json({ message: e.message });
  }
};

exports.uploadSignature = async (req, res) => {
  try {
    const { signature } = req.body;

    if (!signature) {
      return res.status(400).json({ message: "No signature data" });
    }

    const upload = await cloudinary.uploader.upload(signature, {
      folder: "cmms/signatures",
    });

    const wo = await WorkOrder.findById(req.params.id);
    if (!wo) {
      return res.status(404).json({ message: "Work order not found" });
    }

    wo.signature = { url: upload.secure_url };
    wo.status = "DONE";
    await wo.save();

    // ⭐⭐⭐ LOG MAINTAINED + UPDATE STATUS ⭐⭐⭐
    if (wo.assignedAssets?.length) {
      for (const assetId of wo.assignedAssets) {
        await Asset.findByIdAndUpdate(assetId, {
          status: "MAINTENANCE",
        });

        await AssetLog.create({
          asset: assetId,
          workOrder: wo._id,
          action: "MAINTAINED",
        });
      }
    }

    res.json({
      success: true,
      signature: wo.signature,
    });
  } catch (e) {
    console.error("UPLOAD SIGNATURE ERROR 👉", e);
    res.status(500).json({ message: e.message });
  }
};

exports.getDetail = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id).populate(
    "assignedAssets",
    "name code status"
  );
  res.json(wo);
};

exports.updateChecklist = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  if (wo.status === "DONE") {
    return res.status(400).json({ message: "Work order is completed" });
  }
  wo.checklist = req.body.checklist;
  wo.status = "IN_PROGRESS";
  await wo.save();
  res.json(wo);
};

exports.exportPDF = async (req, res) => {
  const wo = await WorkOrder.findById(req.params.id);
  const PDFDocument = require("pdfkit");
  const axios = require("axios");

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
  doc.moveDown();

  /* ===== LINE ===== */
  doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown();

  /* ===== CHECKLIST ===== */
  doc.fontSize(14).text("Checklist");
  doc.moveDown(0.5);

  if (!wo.checklist || wo.checklist.length === 0) {
    doc.fontSize(11).text("- No checklist items");
  } else {
    wo.checklist.forEach((c, i) => {
      doc
        .fontSize(11)
        .text(`${c.isDone ? "☑" : "☐"} ${c.title}`, { indent: 20 });
    });
  }

  doc.moveDown();

  /* ===== PHOTOS ===== */
  if (wo.photos?.length) {
    doc.fontSize(14).text("Photos");
    doc.moveDown(0.5);

    let x = 40;
    let y = doc.y;
    const imgSize = 200;

    for (const p of wo.photos) {
      const img = await axios
        .get(p.url, { responseType: "arraybuffer" })
        .then((r) => r.data);

      doc.image(img, x, y, { width: imgSize });

      x += imgSize + 10;
      if (x > 350) {
        x = 40;
        y += imgSize + 10;
      }
    }

    doc.y = y + imgSize + 20;
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

// workOrder.controller.js
exports.assignAssets = async (req, res) => {
  const { assets } = req.body;
  const wo = await WorkOrder.findById(req.params.id);

  const oldAssets = wo.assignedAssets.map(String);

  // 🔒 CHECK TRƯỚC: asset phải AVAILABLE
  for (const assetId of assets) {
    const asset = await Asset.findById(assetId);

    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }

    if (asset.status !== "AVAILABLE") {
      return res.status(400).json({
        message: `Asset ${asset.name} is not available`,
      });
    }
  }

  // ✅ UPDATE WO
  wo.assignedAssets = assets;
  await wo.save();

  // ✅ ASSIGNED → IN_USE
  for (const assetId of assets) {
    if (!oldAssets.includes(assetId)) {
      await Asset.findByIdAndUpdate(assetId, { status: "IN_USE" });

      await AssetLog.create({
        asset: assetId,
        workOrder: wo._id,
        action: "ASSIGNED",
      });
    }
  }

  // ✅ UNASSIGNED → AVAILABLE
  for (const assetId of oldAssets) {
    if (!assets.includes(assetId)) {
      await Asset.findByIdAndUpdate(assetId, { status: "AVAILABLE" });

      await AssetLog.create({
        asset: assetId,
        workOrder: wo._id,
        action: "UNASSIGNED",
      });
    }
  }

  res.json(wo);
};

exports.assignTechnicians = async (req, res) => {
  const { technicians } = req.body; // array userId

  const wo = await WorkOrder.findById(req.params.id);
  if (!wo) {
    return res.status(404).json({ message: "Work order not found" });
  }

  if (wo.status === "DONE") {
    return res.status(400).json({ message: "Work order completed" });
  }

  wo.assignedTechnicians = technicians;

  // auto chuyển trạng thái
  if (technicians.length && wo.status === "OPEN") {
    wo.status = "IN_PROGRESS";
  }

  await wo.save();
  res.json(wo);
};
