const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/checklistTemplate.controller");

/* ================= LIST ================= */
r.get("/", auth, requireRole("SUPER_ADMIN"), c.getAll);

/* ================= CREATE ================= */
r.post("/", auth, requireRole("SUPER_ADMIN"), c.create);

/* ================= UPDATE ================= */
r.put("/:id", auth, requireRole("SUPER_ADMIN"), c.update);

/* ================= TOGGLE ACTIVE ================= */
r.patch("/:id/toggle", auth, requireRole("SUPER_ADMIN"), c.toggle);

/* ================= DELETE ================= */
r.delete("/:id", auth, requireRole("SUPER_ADMIN"), c.remove);

module.exports = r;
