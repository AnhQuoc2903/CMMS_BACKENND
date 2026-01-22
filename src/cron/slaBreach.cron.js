const WorkOrder = require("../models/WorkOrder");
const SLALog = require("../models/SLALog");

module.exports = async () => {
  try {
    const now = new Date();

    const list = await WorkOrder.find({
      status: { $nin: ["CLOSED", "CANCELLED"] },
      slaDueAt: { $lte: now },
      "sla.breached": false,
    });

    if (!list.length) return;

    for (const wo of list) {
      // ⛔ an toàn thêm 1 lớp
      if (wo.sla?.breached) continue;

      // ===== UPDATE WORK ORDER =====
      wo.sla = {
        breached: true,
        breachedAt: now,
        breachReason: "TIME_EXCEEDED", // quá thời gian cam kết
      };

      await wo.save();

      // ===== SLA LOG =====
      await SLALog.create({
        workOrder: wo._id,
        type: "BREACH",
        note: "SLA breached automatically by cron (time exceeded)",
      });
    }
  } catch (err) {
    console.error("❌ SLA BREACH CRON ERROR:", err.message);
  }
};
