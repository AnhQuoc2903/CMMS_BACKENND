// models/MaintenancePlanLog.js
const mongoose = require("mongoose");

module.exports = mongoose.model(
  "MaintenancePlanLog",
  new mongoose.Schema(
    {
      maintenancePlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MaintenancePlan",
        required: true,
      },

      runAt: {
        type: Date,
        required: true,
      },

      status: {
        type: String,
        enum: ["SUCCESS", "SKIPPED_ASSET_BUSY", "FAILED"],
        required: true,
      },

      createdWorkOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WorkOrder",
        default: null,
      },

      blockedAssets: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Asset",
        },
      ],

      triggeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null, // null = CRON
      },

      errorMessage: String,
    },
    { timestamps: true },
  ),
);
