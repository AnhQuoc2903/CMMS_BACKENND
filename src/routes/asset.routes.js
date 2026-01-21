const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/asset.controller");

/* ================= LIST ================= */
r.get("/", auth, c.getAll);

/* ================= CREATE ================= */
r.post("/", auth, requireRole("SUPER_ADMIN"), c.create);

/* ================= DETAIL ================= */
r.get(
  "/:id",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getDetail,
);

/* ================= UPDATE ================= */
r.patch("/:id", auth, requireRole("SUPER_ADMIN"), c.update);

/* ================= DELETE ================= */
r.delete("/:id", auth, requireRole("SUPER_ADMIN"), c.remove);

/* ================= HISTORY ================= */
r.get(
  "/:id/history",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getHistory,
);

/* ================= MAINTENANCE ================= */
r.patch(
  "/:id/maintain",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.maintain,
);

/* ================= PM HISTORY ================= */
r.get(
  "/:id/pm-history",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getPMHistory,
);

module.exports = r;
