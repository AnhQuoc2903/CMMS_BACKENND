const InventoryLog = require("../models/InventoryLog");

exports.getInventoryLogs = async (req, res) => {
  const { sparePartId, workOrderId } = req.query;

  const filter = {};
  if (sparePartId) filter.sparePart = sparePartId;
  if (workOrderId) filter.workOrder = workOrderId;

  const logs = await InventoryLog.find(filter)
    .populate("sparePart", "name sku")
    .populate("performedBy", "name email")
    .populate("workOrder", "title")
    .sort({ createdAt: -1 });

  res.json(logs);
};
