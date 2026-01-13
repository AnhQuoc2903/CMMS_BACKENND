const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/checklistTemplate.controller");

r.get("/", auth, requireRole("ADMIN"), c.getAll);
r.post("/", auth, requireRole("ADMIN"), c.create);
r.put("/:id", auth, requireRole("ADMIN"), c.update);
r.patch("/:id/toggle", auth, requireRole("ADMIN"), c.toggle);
r.delete("/:id", auth, requireRole("ADMIN"), c.remove);

module.exports = r;
