const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const c = require("../controllers/inventoryLog.controller");

/* ================= INVENTORY LOG ================= */
r.get("/", auth, role("SUPER_ADMIN", "BUILDING_MANAGER"), c.getInventoryLogs);

module.exports = r;
