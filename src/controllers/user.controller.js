const User = require("../models/User");
const ROLES = require("../config/roles");
const AuditLog = require("../models/AuditLog");

exports.getTechnicians = async (req, res) => {
  const techs = await User.find({ role: "TECHNICIAN" }, "name email status");
  res.json(techs);
};

exports.createTechnician = async (req, res) => {
  const { email } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(400).json({ message: "Email already exists" });
  }

  const user = await User.create({
    ...req.body,
    role: ROLES.TECHNICIAN,
  });

  res.json(user);
};

exports.updateTechnician = async (req, res) => {
  const { name, email } = req.body;

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, email },
    { new: true }
  );

  res.json(user);
};

exports.disableTechnician = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: "INACTIVE" },
    { new: true }
  );
  res.json(user);
};

exports.enableTechnician = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: "ACTIVE" },
    { new: true }
  );
  res.json(user);
};

exports.disableTechnician = async (req, res) => {
  const techId = req.params.id;

  const user = await User.findByIdAndUpdate(
    techId,
    { status: "INACTIVE" },
    { new: true }
  );

  await AuditLog.create({
    actor: req.user.id, // admin đang login
    target: techId, // technician bị disable
    action: "DISABLE_TECHNICIAN",
  });

  res.json(user);
};

exports.enableTechnician = async (req, res) => {
  const techId = req.params.id;

  const user = await User.findByIdAndUpdate(
    techId,
    { status: "ACTIVE" },
    { new: true }
  );

  await AuditLog.create({
    actor: req.user.id,
    target: techId,
    action: "ENABLE_TECHNICIAN",
  });

  res.json(user);
};
