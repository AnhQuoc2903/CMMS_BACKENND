const eventBus = require("./eventBus");
const { sendCode } = require("../utils/sendCode");
const User = require("../models/User");
const tpl = require("./emailTemplates.js");

/* ================= WORK ORDER APPROVED ================= */
eventBus.on("WORK_ORDER_APPROVED", async ({ workOrder }) => {
  const users = await User.find({
    role: { $in: ["SUPER_ADMIN", "BUILDING_MANAGER"] },
  });

  for (const u of users) {
    await sendCode({
      to: u.email,
      ...tpl.woApproved(workOrder),
    });
  }
});

/* ================= TECHNICIAN ASSIGNED ================= */
eventBus.on("TECHNICIAN_ASSIGNED", async ({ workOrder, technicians }) => {
  for (const t of technicians) {
    await sendCode({
      to: t.email,
      ...tpl.techAssigned(workOrder),
    });
  }
});

/* ================= SLA BREACHED ================= */
eventBus.on("SLA_BREACHED", async ({ workOrder }) => {
  const admins = await User.find({
    role: { $in: ["SUPER_ADMIN", "BUILDING_MANAGER"] },
  });

  for (const a of admins) {
    await sendCode({
      to: a.email,
      ...tpl.slaBreached(workOrder),
    });
  }
});

/* ================= PM CREATED ================= */
eventBus.on("PM_CREATED", async ({ workOrder }) => {
  const admins = await User.find({
    role: { $in: ["SUPER_ADMIN", "BUILDING_MANAGER"] },
  });

  for (const a of admins) {
    await sendCode({
      to: a.email,
      ...tpl.pmCreated(workOrder),
    });
  }
});

/* ================= TENANT REQUEST ================= */
eventBus.on("TENANT_REQUEST_SUBMITTED", async ({ tenantRequest }) => {
  const users = await User.find({
    role: { $in: ["SUPER_ADMIN", "BUILDING_MANAGER"] },
  });

  for (const u of users) {
    await sendCode({
      to: u.email,
      ...tpl.tenantRequest(tenantRequest),
    });
  }
});
