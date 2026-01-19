const mongoose = require("mongoose");

module.exports = mongoose.model(
  "TenantRequest",
  new mongoose.Schema(
    {
      title: String,
      description: String,

      tenantName: String,
      tenantEmail: String,

      status: {
        type: String,
        enum: [
          "SUBMITTED",
          "BUILDING_APPROVED",
          "MSP_REVIEWED", // 🆕
          "FINAL_APPROVED",
          "REJECTED",
        ],
        default: "SUBMITTED",
      },

      handledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      buildingApproval: {
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        approvedAt: Date,
        note: String,
      },

      mspReview: {
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reviewedAt: Date,
        note: String,
      },

      finalApproval: {
        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        approvedAt: Date,
      },

      workOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WorkOrder",
      },
    },
    { timestamps: true }
  )
);
