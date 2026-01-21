const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/user.controller");

// ================= TECHNICIANS =================

// GET: ADMIN + MANAGER xem danh sách
r.get(
  "/technicians",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getTechnicians,
);

// CREATE: chỉ ADMIN tạo
r.post("/technicians", auth, requireRole("SUPER_ADMIN"), c.createTechnician);

// UPDATE: chỉ ADMIN
r.patch(
  "/technicians/:id",
  auth,
  requireRole("SUPER_ADMIN"),
  c.updateTechnician,
);

// DISABLE: chỉ ADMIN
r.patch(
  "/technicians/:id/disable",
  auth,
  requireRole("SUPER_ADMIN"),
  c.disableTechnician,
);

// ENABLE: chỉ ADMIN
r.patch(
  "/technicians/:id/enable",
  auth,
  requireRole("SUPER_ADMIN"),
  c.enableTechnician,
);

module.exports = r;
