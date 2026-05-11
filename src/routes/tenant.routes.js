const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/tenantRequest.controller");
const { uploadImage } = require("../config/cloudinary");
const optionalAuth = require("../middlewares/optionalAuth");

/* ================= ADMIN LIST ================= */
r.get(
  "/",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER", "MSP_SUPERVISOR"),
  c.getTenantRequests,
);

/* ================= SUBMIT (guest + tenant) ================= */
r.post(
  "/request",
  optionalAuth,
  uploadImage.array("images", 5),
  c.submitTenantRequest,
);

/* ================= TENANT ================= */
r.get("/my", auth, c.getMyRequests);

/* ================= FLOW ================= */
r.post(
  "/:id/building-approve",
  auth,
  requireRole("BUILDING_MANAGER"),
  c.buildingApprove,
);

r.post("/:id/msp-review", auth, requireRole("MSP_SUPERVISOR"), c.mspReview);

r.post("/:id/final-approve", auth, requireRole("SUPER_ADMIN"), c.finalApprove);

/* ================= REJECT ================= */
r.post(
  "/:id/reject",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.rejectTenantRequest,
);

module.exports = r;
