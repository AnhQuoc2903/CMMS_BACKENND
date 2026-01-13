const User = require("../models/User");
const ROLES = require("../config/roles");
const Asset = require("../models/Asset");

module.exports = async () => {
  /* ================= USERS ================= */

  const users = [
    {
      name: "Admin",
      email: "admin@cmms.com",
      password: "123456",
      role: ROLES.ADMIN,
    },
    {
      name: "Manager",
      email: "manager@cmms.com",
      password: "123456",
      role: ROLES.MANAGER,
    },
    {
      name: "Technician A",
      email: "tech@cmms.com",
      password: "123456",
      role: ROLES.TECHNICIAN,
      status: "ACTIVE",
    },
  ];

  for (const u of users) {
    const exists = await User.findOne({ email: u.email });

    if (!exists) {
      await User.create(u);
      console.log(`✅ ${u.role} seeded (${u.email})`);
    } else {
      console.log(`ℹ️ ${u.role} already exists (${u.email})`);
    }
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
  } else {
    console.log("ℹ️ Assets already exist");
  }
};
