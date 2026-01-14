const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/user.controller");

// ================= TECHNICIANS =================

// GET: ADMIN + MANAGER xem danh sách
r.get("/technicians", auth, requireRole("ADMIN", "MANAGER"), c.getTechnicians);

// CREATE: chỉ ADMIN tạo
r.post("/technicians", auth, requireRole("ADMIN"), c.createTechnician);

// UPDATE: chỉ ADMIN
r.patch("/technicians/:id", auth, requireRole("ADMIN"), c.updateTechnician);

// DISABLE: chỉ ADMIN
r.patch(
  "/technicians/:id/disable",
  auth,
  requireRole("ADMIN"),
  c.disableTechnician
);

// ENABLE: chỉ ADMIN
r.patch(
  "/technicians/:id/enable",
  auth,
  requireRole("ADMIN"),
  c.enableTechnician
);

module.exports = r;
