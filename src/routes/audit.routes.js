const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/audit.controller");

r.get(
  "/technicians/:id",
  auth,
  requireRole("ADMIN", "MANAGER"),
  c.getTechnicianLogs,
);

module.exports = r;
