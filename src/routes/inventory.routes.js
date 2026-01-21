const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/inventory.controller");

/* ================= LOW STOCK ================= */
r.get(
  "/low-stock",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getLowStock,
);

/* ================= LIST ================= */
r.get("/", auth, c.getAll);

/* ================= DETAIL ================= */
r.get(
  "/:id",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getDetail,
);

/* ================= CREATE ================= */
r.post("/", auth, requireRole("SUPER_ADMIN"), c.create);

/* ================= UPDATE ================= */
r.patch("/:id", auth, requireRole("SUPER_ADMIN"), c.update);

/* ================= DISABLE ================= */
r.patch("/:id/disable", auth, requireRole("SUPER_ADMIN"), c.disable);

/* ================= ENABLE ================= */
r.patch("/:id/enable", auth, requireRole("SUPER_ADMIN"), c.enable);

/* ================= STOCK IN ================= */
r.post("/:id/stock-in", auth, requireRole("SUPER_ADMIN"), c.stockIn);

module.exports = r;
