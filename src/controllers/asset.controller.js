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
    { new: true },
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

exports.getAssetDowntimeDetail = async (req, res) => {
  const assetId = req.params.id;

  const asset = await Asset.findById(assetId);
  if (!asset) {
    return res.status(404).json({ message: "Asset not found" });
  }

  /* ======================================================
     1️⃣ LẤY TẤT CẢ WORK ORDER CÒN LIÊN QUAN
  ====================================================== */
  const workOrders = await WorkOrder.find({
    assignedAssets: assetId,
    status: { $in: ["IN_PROGRESS", "ON_HOLD"] },
  })
    .select("_id title status")
    .lean();

  /* ======================================================
     2️⃣ ACTIVE DOWNTIME (ĐOẠN ĐANG CHẠY)
  ====================================================== */
  const activeWorkOrders = [];

  for (const wo of workOrders) {
    // START gần nhất mà CHƯA bị END
    const lastStart = await AssetLog.findOne({
      asset: assetId,
      workOrder: wo._id,
      action: "START_MAINTENANCE",
    }).sort({ createdAt: -1 });

    // kiểm tra có END sau START chưa
    const lastEnd = await AssetLog.findOne({
      asset: assetId,
      workOrder: wo._id,
      action: "END_MAINTENANCE",
      createdAt: { $gt: lastStart?.createdAt },
    });

    // nếu đã END thì không active
    if (!lastStart || lastEnd) continue;

    const startedAt = lastStart.startedAt || lastStart.createdAt;
    const now = new Date();
    const downtimeMs = now - new Date(startedAt);

    activeWorkOrders.push({
      _id: wo._id,
      title: wo.title,
      status: wo.status,
      startedAt,
      downtimeMs,
    });
  }

  /* ======================================================
     3️⃣ HISTORY (CÁC ĐOẠN ĐÃ END)
  ====================================================== */
  const historyLogs = await AssetLog.find({
    asset: assetId,
    action: "END_MAINTENANCE",
  })
    .populate("workOrder", "title")
    .sort({ createdAt: -1 })
    .lean();

  const history = historyLogs.map((h) => ({
    _id: h._id,
    workOrder: h.workOrder,
    startedAt: h.startedAt,
    endedAt: h.endedAt,
    downtimeMs: h.downtimeMs || 0,
  }));

  /* ======================================================
     4️⃣ TOTAL DOWNTIME = HISTORY + ACTIVE
  ====================================================== */
  const historyMs = history.reduce((sum, h) => sum + (h.downtimeMs || 0), 0);
  const activeMs = activeWorkOrders.reduce(
    (sum, w) => sum + (w.downtimeMs || 0),
    0,
  );

  res.json({
    totalDowntimeMs: historyMs + activeMs,
    workOrders: activeWorkOrders,
    history,
  });
};
