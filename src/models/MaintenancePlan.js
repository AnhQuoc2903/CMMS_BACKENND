const mongoose = require("mongoose");

module.exports = mongoose.model(
  "MaintenancePlan",
  new mongoose.Schema(
    {
      name: { type: String, required: true },

      assets: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Asset",
          required: true,
        },
      ],

      frequency: {
        type: String,
        enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"],
        required: true,
      },

      checklistTemplate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ChecklistTemplate",
      },

      nextRunAt: { type: Date, required: true },

      lastRunAt: Date,
      lastRunStatus: {
        type: String,
        enum: ["SUCCESS", "FAILED"],
      },

      isActive: { type: Boolean, default: true },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
    { timestamps: true }
  )
);
