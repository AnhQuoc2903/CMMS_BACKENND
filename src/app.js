const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/assets", require("./routes/asset.routes"));
app.use("/api/inventory", require("./routes/inventory.routes"));
app.use("/api/work-orders", require("./routes/workOrder.routes"));
app.use("/api/tenant", require("./routes/tenant.routes"));
app.use("/api/users", require("./routes/user.routes"));
app.use("/api/audit", require("./routes/audit.routes"));
app.use(
  "/api/checklist-templates",
  require("./routes/checklistTemplate.route"),
);
app.use("/api/inventory-logs", require("./routes/inventoryLog.routes"));
app.use("/api/maintenance-plans", require("./routes/maintenancePlan.routes"));
app.use("/api/reports", require("./routes/report.routes"));
app.use("/api/sla", require("./routes/sla.routes"));

module.exports = app;
