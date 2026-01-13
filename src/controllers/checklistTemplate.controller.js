const ChecklistTemplate = require("../models/ChecklistTemplate");

/* ================= GET ALL ================= */
exports.getAll = async (req, res) => {
  const list = await ChecklistTemplate.find().sort({
    createdAt: -1,
  });

  res.json(list);
};

/* ================= CREATE ================= */
exports.create = async (req, res) => {
  const { name, description, category, items } = req.body;

  if (!name || !items?.length) {
    return res.status(400).json({ message: "Invalid checklist template" });
  }

  const template = await ChecklistTemplate.create({
    name,
    description,
    category,
    items,
    createdBy: req.user.id,
  });

  res.json(template);
};

/* ================= UPDATE ================= */
exports.update = async (req, res) => {
  const { name, description, category, items } = req.body;

  const tpl = await ChecklistTemplate.findById(req.params.id);
  if (!tpl) return res.status(404).json({ message: "Not found" });

  tpl.name = name ?? tpl.name;
  tpl.description = description ?? tpl.description;
  tpl.category = category ?? tpl.category;
  tpl.items = items ?? tpl.items;

  await tpl.save();
  res.json(tpl);
};

/* ================= TOGGLE ACTIVE ================= */
exports.toggle = async (req, res) => {
  const t = await ChecklistTemplate.findById(req.params.id);
  if (!t) return res.status(404).json({ message: "Not found" });

  t.isActive = !t.isActive;
  await t.save();

  res.json(t);
};

/* ================= DELETE ================= */
exports.remove = async (req, res) => {
  await ChecklistTemplate.findByIdAndDelete(req.params.id);
  res.json({ success: true });
};
