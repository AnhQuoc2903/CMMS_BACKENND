// src/controllers/sla.controller.js
const WorkOrder = require("../models/WorkOrder");
const User = require("../models/User");

/* =====================================================
   SLA TECHNICIAN RANKING
===================================================== */
exports.getTechnicianSLARanking = async (req, res) => {
  const data = await WorkOrder.aggregate([
    {
      $match: {
        status: "CLOSED",
        assignedTechnicians: { $exists: true, $ne: [] },
      },
    },
    { $unwind: "$assignedTechnicians" },
    {
      $group: {
        _id: "$assignedTechnicians",
        total: { $sum: 1 },
        late: {
          $sum: {
            $cond: [{ $eq: ["$sla.breached", true] }, 1, 0],
          },
        },
      },
    },
    {
      $addFields: {
        onTime: { $subtract: ["$total", "$late"] },
        slaRate: {
          $cond: [
            { $eq: ["$total", 0] },
            0,
            {
              $round: [
                {
                  $multiply: [
                    {
                      $divide: [{ $subtract: ["$total", "$late"] }, "$total"],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          ],
        },
      },
    },
    { $sort: { slaRate: -1, total: -1 } },
  ]);

  const users = await User.find({
    _id: { $in: data.map((d) => d._id) },
  }).select("name email");

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  res.json(
    data.map((d, index) => ({
      rank: index + 1,
      technician: userMap.get(d._id.toString()),
      total: d.total,
      onTime: d.onTime,
      late: d.late,
      slaRate: d.slaRate,
    })),
  );
};

/* =====================================================
   SLA PROFILE 1 TECHNICIAN
===================================================== */
exports.getTechnicianSLAProfile = async (req, res) => {
  const techId = req.params.id;

  const tech = await User.findById(techId).select("name email role");
  if (!tech || tech.role !== "TECHNICIAN") {
    return res.status(404).json({ message: "Technician not found" });
  }

  const orders = await WorkOrder.find({
    status: "CLOSED",
    assignedTechnicians: techId,
  });

  const total = orders.length;
  const late = orders.filter((w) => w.sla?.breached).length;
  const onTime = total - late;

  res.json({
    technician: tech,
    total,
    onTime,
    late,
    slaRate: total ? Math.round((onTime / total) * 100) : 0,
  });
};
