const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/workOrder.controller");
const { uploadImage } = require("../config/cloudinary");

/* ================= GET LIST ================= */
r.get("/", auth, c.getAll);

/* ================= CREATE ================= */
r.post("/", auth, requireRole("SUPER_ADMIN", "BUILDING_MANAGER"), c.create);

/* ================= PRIORITY ================= */
r.patch("/:id/priority", auth, requireRole("SUPER_ADMIN"), c.updatePriority);

/* ================= DETAIL ================= */
r.get("/:id", auth, c.getDetail);

/* ================= ASSIGN ================= */
r.patch("/:id/assets", auth, requireRole("SUPER_ADMIN"), c.assignAssets);

r.patch(
  "/:id/technicians",
  auth,
  requireRole("SUPER_ADMIN"),
  c.assignTechnicians,
);

/* ================= SUBMIT / APPROVE ================= */
r.patch(
  "/:id/submit",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.submitForApproval,
);

r.patch("/:id/approve", auth, requireRole("SUPER_ADMIN"), c.approveWorkOrder);

r.patch("/:id/reject", auth, requireRole("SUPER_ADMIN"), c.rejectWorkOrder);

/* ================= START & EXECUTION ================= */
r.patch("/:id/start", auth, requireRole("TECHNICIAN"), c.startWorkOrder);

r.patch("/:id/checklist", auth, requireRole("TECHNICIAN"), c.updateChecklist);

r.post(
  "/:id/photo",
  auth,
  requireRole("TECHNICIAN"),
  uploadImage.single("photo"),
  c.uploadPhoto,
);

r.post("/:id/signature", auth, requireRole("TECHNICIAN"), c.uploadSignature);

/* ================= REVIEW / VERIFY ================= */
r.patch("/:id/review", auth, requireRole("MSP_SUPERVISOR"), c.reviewWorkOrder);

r.patch(
  "/:id/review-reject",
  auth,
  requireRole("MSP_SUPERVISOR"),
  c.rejectReview,
);

r.patch("/:id/verify", auth, requireRole("SUPER_ADMIN"), c.verifyWorkOrder);

r.patch(
  "/:id/verify-reject",
  auth,
  requireRole("SUPER_ADMIN"),
  c.rejectVerification,
);

/* ================= HISTORY ================= */
r.get(
  "/:id/my-history",
  auth,
  requireRole("TECHNICIAN"),
  c.getMyWorkOrderHistory,
);

/* ================= INVENTORY ================= */
r.patch("/:id/used-parts", auth, requireRole("TECHNICIAN"), c.updateUsedParts);

/* ================= CLOSE / CANCEL ================= */
r.patch(
  "/:id/close",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.closeWorkOrder,
);

r.post(
  "/:id/cancel",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.cancelWorkOrder,
);

/* ================= HOLD / RESUME ================= */
r.post(
  "/:id/hold",
  auth,
  requireRole("SUPER_ADMIN", "TECHNICIAN"),
  c.holdWorkOrder,
);

r.post(
  "/:id/resume",
  auth,
  requireRole("SUPER_ADMIN", "TECHNICIAN"),
  c.resumeWorkOrder,
);

r.post(
  "/:id/apply-checklist-template",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.applyChecklistTemplate,
);

/* ================= PDF ================= */
r.get("/:id/pdf", auth, c.exportPDF);

r.get(
  "/:id/timeline",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER", "MSP_SUPERVISOR"),
  c.getTimeline,
);

r.get(
  "/:id/sla-timeline",
  auth,
  requireRole("SUPER_ADMIN", "BUILDING_MANAGER"),
  c.getSLATimeline,
);

module.exports = r;
