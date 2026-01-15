const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const c = require("../controllers/inventoryLog.controller");

r.get("/", auth, role("ADMIN", "MANAGER"), c.getInventoryLogs);

module.exports = r;
