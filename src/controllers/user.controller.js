const User = require("../models/User"); // ✅ BẠN ĐANG THIẾU DÒNG NÀY
const ROLES = require("../config/roles");
// user.controller.js

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
