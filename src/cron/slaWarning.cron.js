const WorkOrder = require("../models/WorkOrder");
const eventBus = require("../events/eventBus");

module.exports = async () => {
  const now = Date.now();

  const list = await WorkOrder.find({
    slaStartAt: { $exists: true },
    slaDueAt: { $exists: true },
    status: { $in: ["APPROVED", "ASSIGNED", "IN_PROGRESS"] },
  });

  for (const wo of list) {
    const total = wo.slaDueAt - wo.slaStartAt;
    const remain = wo.slaDueAt - now;

    if (remain / total <= 0.2 && !wo.sla?.warned) {
      wo.sla = { ...wo.sla, warned: true };
      await wo.save();

      eventBus.emit("SLA_WARNING", { workOrder: wo });
    }
  }
};
