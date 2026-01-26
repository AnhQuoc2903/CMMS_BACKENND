const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const c = require("../controllers/auth.controller");

r.post("/login", c.login);
r.post("/change-password", auth, c.changePassword);
r.post("/forgot-password", c.forgotPassword);
r.post("/reset-password", c.resetPassword);

module.exports = r;
