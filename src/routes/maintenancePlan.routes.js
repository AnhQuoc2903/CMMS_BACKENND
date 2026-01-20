const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const c = require("../controllers/maintenancePlan.controller");

r.get("/", auth, role("ADMIN", "MANAGER"), c.getAll);
r.post("/", auth, role("ADMIN"), c.create);
r.post("/:id/run", auth, role("ADMIN"), c.runNow);

// routes/maintenancePlan.routes.js
r.get("/:id/logs", auth, role("ADMIN", "MANAGER"), c.getLogs);

r.get("/:id/work-orders", auth, role("ADMIN", "MANAGER"), c.getPlanWorkOrders);

r.patch("/:id/toggle", auth, role("ADMIN"), c.toggle);
r.patch("/:id", auth, role("ADMIN"), c.update);

module.exports = r;
