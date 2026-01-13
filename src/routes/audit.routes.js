const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/audit.controller");
const ROLES = require("../config/roles");

r.get(
  "/technicians/:id",
  auth,
  requireRole(ROLES.ADMIN, ROLES.MANAGER),
  c.getTechnicianLogs
);

module.exports = r;
