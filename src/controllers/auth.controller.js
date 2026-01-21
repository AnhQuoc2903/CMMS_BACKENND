const User = require("../models/User");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid login" });

  const ok = await user.compare(password);
  if (!ok) return res.status(400).json({ message: "Invalid login" });

  if (user.role === "TECHNICIAN" && user.status !== "ACTIVE") {
    return res.status(403).json({ message: "Account inactive" });
  }

  const token = jwt.sign(
    {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );

  res.json({ token });
};
