const Asset = require("../models/Asset");
const AssetLog = require("../models/AssetLog");
const WorkOrder = require("../models/WorkOrder");

exports.create = (req, res) => Asset.create(req.body).then((r) => res.json(r));

// controllers/asset.controller.js
exports.getAll = async (req, res) => {
  let { q, status } = req.query;
  const filter = {};

  // 🔍 Search name / code (FIX)
  if (q && q.trim() !== "") {
    q = q.trim();
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { code: { $regex: q, $options: "i" } },
    ];
  }

  // 🎯 Filter status
  if (status && status !== "ALL") {
    filter.status = status;
  }

  const assets = await Asset.find(filter).sort({ createdAt: -1 });
  res.json(assets);
};

// ✅ EDIT
exports.update = async (req, res) => {
  const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(asset);
};

// ✅ DELETE
exports.remove = async (req, res) => {
  await Asset.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};

exports.getHistory = async (req, res) => {
  const logs = await AssetLog.find({ asset: req.params.id })
    .populate("workOrder", "title status")
    .sort({ createdAt: -1 });

  res.json(logs);
};

// ✅ GET DETAIL
exports.getDetail = async (req, res) => {
  const asset = await Asset.findById(req.params.id);

  if (!asset) {
    return res.status(404).json({ message: "Asset not found" });
  }

  res.json(asset);
};

exports.maintain = async (req, res) => {
  const asset = await Asset.findByIdAndUpdate(
    req.params.id,
    { status: "MAINTENANCE" },
    { new: true }
  );

  await AssetLog.create({
    asset: asset._id,
    action: "MAINTAINED",
    note: req.body.note,
  });

  res.json(asset);
};

exports.getPMHistory = async (req, res) => {
  const assetId = req.params.id;

  const workOrders = await WorkOrder.find({
    assignedAssets: assetId,
    maintenancePlan: { $ne: null },
  })
    .populate("maintenancePlan", "name frequency")
    .sort({ createdAt: -1 });

  res.json(workOrders);
};
