const User = require("../models/User");
const Asset = require("../models/Asset");
const ROLES = require("../config/roles");

module.exports = async () => {
  /* ================= USERS ================= */

  const users = [
    {
      name: "Super Admin",
      email: "admin@cmms.com",
      password: "123456",
      role: ROLES.SUPER_ADMIN,
    },
    {
      name: "Building Manager",
      email: "bm@cmms.com",
      password: "123456",
      role: ROLES.BUILDING_MANAGER,
    },
    {
      name: "MSP Supervisor",
      email: "msp@cmms.com",
      password: "123456",
      role: ROLES.MSP_SUPERVISOR,
    },
    {
      name: "Technician",
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
      console.log(`✅ ${u.role} seeded`);
    }
  }

  /* ================= ASSETS ================= */
  if ((await Asset.countDocuments()) === 0) {
    await Asset.insertMany([
      { name: "Pump", code: "P-001", location: "Plant A" },
      { name: "Motor", code: "M-002", location: "Plant B" },
    ]);
    console.log("✅ Assets seeded");
  }
};
