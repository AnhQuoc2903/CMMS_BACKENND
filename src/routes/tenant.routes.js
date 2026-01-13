const r = require("express").Router();
const TenantRequest = require("../models/TenantRequest");
const auth = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const c = require("../controllers/tenantRequest.controller");

// ===== LIST =====
r.get("/", auth, requireRole("ADMIN", "MANAGER"), c.getTenantRequests);

// ===== TENANT SUBMIT =====
r.post("/request", async (req, res) => {
  const { title, description, tenantName, tenantEmail } = req.body;

  const tr = await TenantRequest.create({
    title,
    description,
    tenantName,
    tenantEmail,
  });

  res.json(tr);
});

// ===== APPROVE =====
r.patch(
  "/:id/approve",
  auth,
  requireRole("ADMIN", "MANAGER"),
  c.approveTenantRequest
);

// ===== REJECT =====
r.patch(
  "/:id/reject",
  auth,
  requireRole("ADMIN", "MANAGER"),
  c.rejectTenantRequest
);

module.exports = r;
