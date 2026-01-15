const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/inventory.controller");

r.get("/low-stock", auth, c.getLowStock);

/* ================= LIST ================= */
r.get("/", auth, c.getAll);

/* ================= DETAIL ================= */
r.get("/:id", auth, c.getDetail);

/* ================= CREATE ================= */
r.post("/", auth, requireRole("ADMIN", "MANAGER"), c.create);

/* ================= UPDATE ================= */
r.patch("/:id", auth, requireRole("ADMIN", "MANAGER"), c.update);

r.patch("/:id/disable", auth, requireRole("ADMIN", "MANAGER"), c.disable);
r.patch("/:id/enable", auth, requireRole("ADMIN", "MANAGER"), c.enable);
r.post("/:id/stock-in", auth, requireRole("ADMIN", "MANAGER"), c.stockIn);

module.exports = r;
