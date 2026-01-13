const User = require("../models/User");
const ROLES = require("../config/roles");
const Asset = require("../models/Asset");

module.exports = async () => {
  /* ================= ADMIN ================= */
  const adminExists = await User.findOne({ role: ROLES.ADMIN });

  if (!adminExists) {
    await User.create({
      name: "Admin",
      email: "admin@cmms.com",
      password: "123456",
      role: ROLES.ADMIN,
    });
    console.log("✅ Admin seeded");
  }

  /* ================= TECHNICIAN ================= */
  const techExists = await User.findOne({ role: ROLES.TECHNICIAN });

  if (!techExists) {
    await User.create({
      name: "Technician A",
      email: "tech@cmms.com",
      password: "123456",
      role: ROLES.TECHNICIAN,
    });
    console.log("✅ Technician seeded");
  }

  /* ================= ASSETS ================= */
  const assetCount = await Asset.countDocuments();

  if (assetCount === 0) {
    await Asset.insertMany([
      {
        name: "Pump",
        code: "P-001",
        category: "Pump",
        location: "Plant A",
      },
      {
        name: "Motor",
        code: "M-002",
        category: "Motor",
        location: "Plant B",
      },
    ]);

    console.log("✅ Assets seeded");
  }
};
