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

module.exports = r;
