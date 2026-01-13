const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const c = require("../controllers/asset.controller");

r.get("/", auth, c.getAll);
r.post("/", auth, c.create);

r.get("/:id", auth, c.getDetail); // ✅ DETAIL
r.patch("/:id", auth, c.update); // ✅ EDIT
r.delete("/:id", auth, c.remove); // ✅ DELETE

r.get("/:id/history", auth, c.getHistory);
r.patch("/:id/maintain", auth, c.maintain);
// ✅ LOGS

module.exports = r;
