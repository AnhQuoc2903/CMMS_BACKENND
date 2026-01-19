const MaintenancePlan = require("../models/MaintenancePlan");
const { calculateNextRun } = require("../utils/pm.util");
const ChecklistTemplate = require("../models/ChecklistTemplate");
const WorkOrder = require("../models/WorkOrder");
const Asset = require("../models/Asset");

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
    "checklistTemplate"
  );

  if (!plan || !plan.isActive) {
    return res.status(400).json({ message: "Plan inactive or not found" });
  }

  /* ===== 1️⃣ CHECK ASSET BUSY ===== */
  const assets = await Asset.find({ _id: { $in: plan.assets } });

  const blocked = assets.filter((a) =>
    ["IN_USE", "MAINTENANCE"].includes(a.status)
  );

  if (blocked.length > 0) {
    return res.status(400).json({
      message: `Assets busy: ${blocked.map((a) => a.name).join(", ")}`,
    });
  }

  if (
    plan.lastRunAt &&
    new Date(plan.lastRunAt).toDateString() === new Date().toDateString()
  ) {
    return res.status(400).json({
      message: "Maintenance plan already ran today",
    });
  }

  /* ===== 2️⃣ CREATE WORK ORDER ===== */
  const wo = await WorkOrder.create({
    title: `[PM] ${plan.name}`,
    description: "Preventive maintenance",
    assignedAssets: plan.assets,
    maintenancePlan: plan._id,
    createdBy: req.user.id,
    status: "APPROVED",
  });

  /* ===== 3️⃣ CHECKLIST SNAPSHOT ===== */
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

  /* ===== 4️⃣ UPDATE PLAN (QUAN TRỌNG) ===== */
  plan.lastRunAt = new Date();
  plan.lastRunStatus = "SUCCESS";
  plan.nextRunAt = calculateNextRun(plan.nextRunAt, plan.frequency);

  await plan.save();

  res.json(wo);
};
