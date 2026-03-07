const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");
const c = require("../controllers/assetGroup.controller");

r.get("/", auth, c.getAll);

r.post("/", auth, c.create);

r.patch("/:id", auth, c.update);

r.delete("/:id", auth, c.remove);

module.exports = r;
