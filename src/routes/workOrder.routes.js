const r = require("express").Router();
const auth = require("../middlewares/auth.middleware");
const c = require("../controllers/workOrder.controller");
const requireRole = require("../middlewares/role.middleware");
const { uploadImage } = require("../config/cloudinary");

// ✅ GET LIST (CÁI BẠN ĐANG THIẾU)
r.get("/", auth, c.getAll);

r.post("/", auth, c.create);
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

module.exports = r;
