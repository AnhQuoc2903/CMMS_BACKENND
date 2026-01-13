const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const c = require("../controllers/inventory.controller");

r.post("/", auth, c.create);
r.get("/", auth, c.getAll);

module.exports = r;
