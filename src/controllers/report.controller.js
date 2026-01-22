const WorkOrder = require("../models/WorkOrder");

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
