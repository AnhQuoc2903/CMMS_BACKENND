const WorkOrder = require("../models/WorkOrder");

const Asset = require("../models/Asset");
const MaintenancePlan = require("../models/MaintenancePlan");

exports.getSLAReport = async (req, res) => {
  const closed = await WorkOrder.find({ status: "CLOSED" });

  const total = closed.length;
  const late = closed.filter((w) => w.sla?.breached).length;
  const onTime = total - late;

  res.json({
    total,
    onTime,
    late,
    onTimeRate: total ? Math.round((onTime / total) * 100) : 0,
    lateRate: total ? Math.round((late / total) * 100) : 0,
  });
};

exports.getSLAMonthlyReport = async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();

  const data = await WorkOrder.aggregate([
    {
      $match: {
        status: "CLOSED",
        closedAt: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$closedAt" },
          breached: "$sla.breached",
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // chuẩn hóa 12 tháng
  const result = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    onTime: 0,
    late: 0,
  }));

  data.forEach((d) => {
    const m = d._id.month - 1;
    if (d._id.breached) result[m].late = d.count;
    else result[m].onTime = d.count;
  });

  res.json(
    result.map((r) => ({
      ...r,
      total: r.onTime + r.late,
      slaRate: r.total ? Math.round((r.onTime / r.total) * 100) : 0,
    })),
  );
};

exports.getSummary = async (req, res) => {
  const days = parseInt(req.query.days);
  const match = days
    ? { createdAt: { $gte: new Date(Date.now() - days * 86400000) } }
    : {};

  const totalWO = await WorkOrder.countDocuments(match);
  const openWO = await WorkOrder.countDocuments({
    ...match,
    status: { $nin: ["CLOSED", "CANCELLED"] },
  });

  const assets = await Asset.find();
  const down = assets.filter((a) => a.status !== "AVAILABLE").length;

  res.json({
    totalWO,
    openWO,
    assetDownRate: assets.length ? Math.round((down / assets.length) * 100) : 0,
  });
};

exports.getWorkOrderByStatus = async (req, res) => {
  const days = parseInt(req.query.days); // 7 | 30 | undefined
  const match = {};

  if (days) {
    match.createdAt = {
      $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    };
  }

  const data = await WorkOrder.aggregate([
    { $match: match },
    { $group: { _id: "$status", value: { $sum: 1 } } },
  ]);

  res.json(data.map((d) => ({ status: d._id, value: d.value })));
};

exports.getSLAStats = async (req, res) => {
  const total = await WorkOrder.countDocuments({ status: "CLOSED" });
  const late = await WorkOrder.countDocuments({
    status: "CLOSED",
    "sla.breached": true,
  });
  res.json({
    total,
    late,
    onTime: total - late,
    slaRate: total ? Math.round(((total - late) / total) * 100) : 0,
  });
};

exports.getPMStats = async (req, res) => {
  const total = await MaintenancePlan.countDocuments();
  const active = await MaintenancePlan.countDocuments({ isActive: true });
  res.json({
    total,
    active,
    complianceRate: total ? Math.round((active / total) * 100) : 0,
  });
};

exports.getOverdueWorkOrders = async (req, res) => {
  const now = new Date();
  const list = await WorkOrder.find({
    status: { $nin: ["CLOSED", "CANCELLED"] },
    slaDueAt: { $lt: now },
  }).select("title priority slaDueAt status");

  res.json(list);
};

exports.getAssetDowntimeSummary = async (req, res) => {
  const now = new Date();

  const data = await WorkOrder.aggregate([
    {
      $match: {
        status: { $in: ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"] },
        assignedAssets: { $exists: true, $ne: [] },
      },
    },

    // 1️⃣ TÁCH mỗi asset ra 1 dòng
    { $unwind: "$assignedAssets" },

    // 2️⃣ group theo assetId
    {
      $group: {
        _id: "$assignedAssets",
        downtimeMs: {
          $sum: {
            $subtract: [
              { $literal: now },
              "$createdAt", // hoặc startedAt nếu bạn có
            ],
          },
        },
        woCount: { $sum: 1 },
      },
    },

    // 3️⃣ join asset
    {
      $lookup: {
        from: "assets",
        localField: "_id",
        foreignField: "_id",
        as: "asset",
      },
    },
    { $unwind: "$asset" },
  ]);

  res.json(
    data.map((d) => ({
      assetId: d.asset._id,
      assetName: d.asset.name,
      category: d.asset.category,
      woCount: d.woCount,
      downtimeHours: Number((d.downtimeMs / 1000 / 60 / 60).toFixed(2)),
    })),
  );
};
