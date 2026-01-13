const r = require("express").Router();
const WorkOrder = require("../models/WorkOrder");

r.post("/request", async (req, res) => {
  const { title, description } = req.body;

  const wo = await WorkOrder.create({
    title,
    description,
    createdBy: "TENANT",
    status: "OPEN",
  });

  res.json(wo);
});

module.exports = r;
