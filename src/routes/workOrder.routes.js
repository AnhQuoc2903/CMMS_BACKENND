const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const c = require("../controllers/workOrder.controller");
const requireRole = require("../middlewares/role.middleware");
const { uploadImage } = require("../config/cloudinary");

// ✅ GET LIST (CÁI BẠN ĐANG THIẾU)
r.get("/", auth, c.getAll);

r.post("/", auth, requireRole("ADMIN", "MANAGER"), c.create);

r.get("/:id", auth, c.getDetail);

r.patch("/:id/checklist", auth, c.updateChecklist);

r.get("/:id/pdf", auth, c.exportPDF);

r.patch("/:id/assets", auth, c.assignAssets);

r.post("/:id/photo", auth, uploadImage.single("photo"), c.uploadPhoto);
r.post("/:id/signature", auth, c.uploadSignature);
r.patch(
  "/:id/technicians",
  auth,
  requireRole("ADMIN", "MANAGER"),
  c.assignTechnicians
);

r.patch("/:id/submit", auth, c.submitForApproval);

r.patch(
  "/:id/approve",
  auth,
  requireRole("ADMIN", "MANAGER"),
  c.approveWorkOrder
);

r.patch(
  "/:id/reject",
  auth,
  requireRole("ADMIN", "MANAGER"),
  c.rejectWorkOrder
);

r.patch("/:id/close", auth, requireRole("ADMIN", "MANAGER"), c.closeWorkOrder);
r.patch("/:id/start", auth, requireRole("TECHNICIAN"), c.startWorkOrder);

r.post(
  "/:id/apply-checklist-template",
  auth,
  requireRole("ADMIN", "MANAGER"),
  c.applyChecklistTemplate
);

module.exports = r;
