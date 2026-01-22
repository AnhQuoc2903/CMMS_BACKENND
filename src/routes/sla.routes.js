// src/routes/sla.routes.js
const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/sla.controller");

r.get(
  "/technicians/ranking",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getTechnicianSLARanking,
);

r.get(
  "/technicians/:id",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getTechnicianSLAProfile,
);

module.exports = r;
