const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/report.controller");

r.get(
  "/sla",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getSLAReport,
);

r.get(
  "/sla/monthly",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getSLAMonthlyReport,
);

r.get(
  "/dashboard/summary",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getSummary,
);
r.get(
  "/dashboard/status",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getWorkOrderByStatus,
);
r.get(
  "/dashboard/sla",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getSLAStats,
);
r.get(
  "/dashboard/pm",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getPMStats,
);
r.get(
  "/dashboard/overdue",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getOverdueWorkOrders,
);

r.get(
  "/dashboard/asset-downtime",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getAssetDowntimeSummary,
);

module.exports = r;
