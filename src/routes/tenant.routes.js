const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/tenantRequest.controller");

/* ======================================================
   LIST (ADMIN / MANAGER)
====================================================== */
r.get(
  "/",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER", "MSP_SUPERVISOR"),
  c.getTenantRequests,
);

/* ======================================================
   TENANT SUBMIT (PUBLIC)
====================================================== */
r.post("/request", c.submitTenantRequest);

/* ======================================================
   FLOW CHUẨN
====================================================== */

// Building approve
r.post(
  "/:id/building-approve",
  auth,
  requireRole("BUILDING_MANAGER"),
  c.buildingApprove,
);

// MSP review
r.post("/:id/msp-review", auth, requireRole("MSP_SUPERVISOR"), c.mspReview);

// Final approve → create WorkOrder
r.post("/:id/final-approve", auth, requireRole("SUPER_ADMIN"), c.finalApprove);

/* ======================================================
   REJECT
====================================================== */
r.post(
  "/:id/reject",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.rejectTenantRequest,
);

module.exports = r;
