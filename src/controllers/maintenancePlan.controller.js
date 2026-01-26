const MaintenancePlan = require("../models/MaintenancePlan");
const { calculateNextRun } = require("../utils/pm.util");
const ChecklistTemplate = require("../models/ChecklistTemplate");
const WorkOrder = require("../models/WorkOrder");
const Asset = require("../models/Asset");
const MaintenancePlanLog = require("../models/MaintenancePlanLog");
const { assignAssetsToWorkOrder } = require("../utils/assetAssign.util");
const eventBus = require("../events/eventBus");

exports.getPlanWorkOrders = async (req, res) => {
  const workOrders = await WorkOrder.find({
    maintenancePlan: req.params.id,
  })
    .sort({ createdAt: -1 })
    .select("title status createdAt dueAt");

  res.json(workOrders);
};

/* ===== GET ALL ===== */
exports.getAll = async (req, res) => {
  const plans = await MaintenancePlan.find()
    .populate("assets", "name code")
    .populate("checklistTemplate", "name")
    .sort({ createdAt: -1 });

  res.json(plans);
};

/* ===== CREATE ===== */
exports.create = async (req, res) => {
  const { name, assets, frequency, checklistTemplate, startDate } = req.body;

  if (!name || !assets?.length || !frequency) {
    return res.status(400).json({ message: "Invalid maintenance plan" });
  }

  const plan = await MaintenancePlan.create({
    name,
    assets,
    frequency,
    checklistTemplate,
    nextRunAt: startDate ? new Date(startDate) : new Date(),
    createdBy: req.user.id,
  });

  res.json(plan);
};

/* ===== TOGGLE ACTIVE ===== */
exports.toggle = async (req, res) => {
  const plan = await MaintenancePlan.findById(req.params.id);
  if (!plan) return res.status(404).json({ message: "Not found" });

  plan.isActive = !plan.isActive;
  await plan.save();

  res.json(plan);
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { name, assets, frequency, checklistTemplate, nextRunAt } = req.body;

  const plan = await MaintenancePlan.findById(id);
  if (!plan) {
    return res.status(404).json({ message: "Maintenance plan not found" });
  }

  if (name !== undefined) plan.name = name;
  if (assets !== undefined) plan.assets = assets;
  if (frequency !== undefined) plan.frequency = frequency;
  if (checklistTemplate !== undefined)
    plan.checklistTemplate = checklistTemplate || null;
  if (nextRunAt !== undefined) plan.nextRunAt = new Date(nextRunAt);

  await plan.save();

  res.json(plan);
};

exports.runNow = async (req, res) => {
  const plan = await MaintenancePlan.findById(req.params.id).populate(
    "checklistTemplate",
  );

  if (!plan || !plan.isActive) {
    return res.status(400).json({ message: "Plan inactive or not found" });
  }

  const now = new Date();

  /**
   * 🚫 1️⃣ CHẶN CHẠY LẠI TRONG CÙNG 1 NGÀY (DÙ SUCCESS HAY SKIPPED)
   */
  if (
    plan.lastRunAt &&
    new Date(plan.lastRunAt).toDateString() === now.toDateString()
  ) {
    return res.status(400).json({
      message: "Maintenance plan already ran today",
    });
  }

  /**
   * 🚦 2️⃣ CHECK ASSET BUSY
   */
  const assets = await Asset.find({ _id: { $in: plan.assets } });
  const blocked = assets.filter((a) =>
    ["IN_USE", "MAINTENANCE"].includes(a.status),
  );

  if (blocked.length > 0) {
    await MaintenancePlanLog.create({
      maintenancePlan: plan._id,
      runAt: now,
      status: "SKIPPED_ASSET_BUSY",
      blockedAssets: blocked.map((a) => a._id),
      triggeredBy: req.user.id,
    });

    plan.lastRunAt = now;
    plan.lastRunStatus = "SKIPPED_ASSET_BUSY";
    plan.nextRunAt = calculateNextRun(plan.nextRunAt, plan.frequency);
    await plan.save();

    return res.json({
      skipped: true,
      message: "PM skipped due to busy assets",
    });
  }

  try {
    /**
     * 🔒 3️⃣ LOCK PLAN (ANTI DUP)
     */
    const locked = await MaintenancePlan.findOneAndUpdate(
      {
        _id: plan._id,
        lastRunAt: { $ne: now },
      },
      {},
      { new: true },
    );

    if (!locked) {
      return res.status(409).json({ message: "Plan is already running" });
    }

    /**
     * 📄 4️⃣ CREATE WORK ORDER
     */
    const wo = await WorkOrder.create({
      title: `[PM] ${plan.name}`,
      description: "Preventive maintenance",
      assignedAssets: plan.assets,
      maintenancePlan: plan._id,
      createdBy: req.user.id,
      status: "ASSIGNED",
    });

    eventBus.emit("PM_CREATED", {
      workOrder: wo,
    });

    /**
     * 🔥 5️⃣ ASSIGN ASSET → IN_USE
     */
    await assignAssetsToWorkOrder({
      assetIds: plan.assets,
      workOrderId: wo._id,
      action: "ASSIGNED",
      note: "Assigned by maintenance plan (Run Now)",
    });

    /**
     * ✅ 6️⃣ SNAPSHOT CHECKLIST
     */
    if (plan.checklistTemplate) {
      wo.checklist = plan.checklistTemplate.items.map((i) => ({
        title: i.title,
        isDone: false,
      }));

      wo.checklistTemplate = {
        templateId: plan.checklistTemplate._id,
        name: plan.checklistTemplate.name,
      };

      await wo.save();
    }

    /**
     * 🧾 7️⃣ LOG SUCCESS
     */
    await MaintenancePlanLog.create({
      maintenancePlan: plan._id,
      runAt: now,
      status: "SUCCESS",
      createdWorkOrder: wo._id,
      triggeredBy: req.user.id,
    });

    /**
     * 🔁 8️⃣ UPDATE PLAN
     */
    plan.lastRunAt = now;
    plan.lastRunStatus = "SUCCESS";
    plan.nextRunAt = calculateNextRun(plan.nextRunAt, plan.frequency);
    await plan.save();

    res.json(wo);
  } catch (err) {
    await MaintenancePlanLog.create({
      maintenancePlan: plan._id,
      runAt: now,
      status: "FAILED",
      errorMessage: err.message,
      triggeredBy: req.user.id,
    });

    throw err;
  }
};

exports.getLogs = async (req, res) => {
  const logs = await MaintenancePlanLog.find({
    maintenancePlan: req.params.id,
  })
    .populate("createdWorkOrder", "title status")
    .populate("triggeredBy", "name role")
    .sort({ runAt: -1 });

  res.json(logs);
};
