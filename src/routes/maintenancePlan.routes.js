const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const c = require("../controllers/maintenancePlan.controller");

/* ================= LIST ================= */
r.get("/", auth, role("SUPER_ADMIN", "BUILDING_MANAGER"), c.getAll);

/* ================= CREATE ================= */
r.post("/", auth, role("SUPER_ADMIN"), c.create);

/* ================= RUN NOW ================= */
r.post("/:id/run", auth, role("SUPER_ADMIN"), c.runNow);

/* ================= LOGS ================= */
r.get("/:id/logs", auth, role("SUPER_ADMIN", "BUILDING_MANAGER"), c.getLogs);

/* ================= WORK ORDERS ================= */
r.get(
  "/:id/work-orders",
  auth,
  role("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getPlanWorkOrders,
);

/* ================= TOGGLE ACTIVE ================= */
r.patch("/:id/toggle", auth, role("SUPER_ADMIN"), c.toggle);

/* ================= UPDATE ================= */
r.patch("/:id", auth, role("SUPER_ADMIN"), c.update);

module.exports = r;
