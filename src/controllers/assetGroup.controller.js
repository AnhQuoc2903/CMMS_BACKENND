const AssetGroup = require("../models/AssetGroup");

/* ================= GET ALL ================= */

exports.getAll = async (req, res) => {
  const groups = await AssetGroup.find().sort({ name: 1 });
  res.json(groups);
};

/* ================= CREATE ================= */

exports.create = async (req, res) => {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  const exists = await AssetGroup.findOne({ name });

  if (exists) {
    return res.status(400).json({
      message: "Group already exists",
    });
  }

  const group = await AssetGroup.create({
    name,
    description,
  });

  res.json(group);
};

/* ================= UPDATE ================= */

exports.update = async (req, res) => {
  const group = await AssetGroup.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.json(group);
};

/* ================= DELETE ================= */

exports.remove = async (req, res) => {
  await AssetGroup.findByIdAndDelete(req.params.id);

  res.json({ success: true });
};
