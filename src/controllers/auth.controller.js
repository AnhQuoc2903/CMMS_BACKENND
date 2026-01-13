// controllers/auth.controller.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid login" });

  const ok = await user.compare(password);
  if (!ok) return res.status(400).json({ message: "Invalid login" });

  // ❌ TECHNICIAN INACTIVE KHÔNG ĐƯỢC LOGIN
  if (user.role === "TECHNICIAN" && user.status !== "ACTIVE") {
    return res.status(403).json({ message: "Account inactive" });
  }

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET
  );

  res.json({ token, role: user.role });
};
