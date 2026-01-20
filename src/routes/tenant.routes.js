const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/tenantRequest.controller");

/* ======================================================
   LIST (ADMIN / MANAGER)
====================================================== */
r.get("/", auth, requireRole("ADMIN", "MANAGER"), c.getTenantRequests);

/* ======================================================
   TENANT SUBMIT (PUBLIC)
====================================================== */
r.post("/request", c.submitTenantRequest);

/* ======================================================
   FLOW CHUẨN
====================================================== */

// Building approve
r.post("/:id/building-approve", auth, requireRole("ADMIN"), c.buildingApprove);

// MSP review
r.post("/:id/msp-review", auth, requireRole("MANAGER"), c.mspReview);

// Final approve → create WorkOrder
r.post("/:id/final-approve", auth, requireRole("ADMIN"), c.finalApprove);

/* ======================================================
   REJECT
====================================================== */
r.post(
  "/:id/reject",
  auth,
  requireRole("ADMIN", "MANAGER"),
  c.rejectTenantRequest,
);

module.exports = r;
