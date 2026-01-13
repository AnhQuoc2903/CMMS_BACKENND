const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/user.controller");
const ROLES = require("../config/roles");

// ================= TECHNICIANS =================

// GET: ADMIN + MANAGER xem danh sách
r.get(
  "/technicians",
  auth,
  requireRole(ROLES.ADMIN, ROLES.MANAGER),
  c.getTechnicians
);

// CREATE: chỉ ADMIN tạo
r.post("/technicians", auth, requireRole(ROLES.ADMIN), c.createTechnician);

// UPDATE: chỉ ADMIN
r.patch("/technicians/:id", auth, requireRole(ROLES.ADMIN), c.updateTechnician);

// DISABLE: chỉ ADMIN
r.patch(
  "/technicians/:id/disable",
  auth,
  requireRole(ROLES.ADMIN),
  c.disableTechnician
);

// ENABLE: chỉ ADMIN
r.patch(
  "/technicians/:id/enable",
  auth,
  requireRole(ROLES.ADMIN),
  c.enableTechnician
);

module.exports = r;
