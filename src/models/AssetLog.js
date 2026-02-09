const mongoose = require("mongoose");

module.exports = mongoose.model(
  "AssetLog",
  new mongoose.Schema(
    {
      asset: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Asset",
        required: true,
      },
      workOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WorkOrder",
      },
      action: {
        type: String,
        enum: [
          "ASSIGNED",
          "UNASSIGNED",
          "START_MAINTENANCE",
          "END_MAINTENANCE",
          "CANCEL_MAINTENANCE",
          "RESUME_MAINTENANCE",
          "PAUSE_MAINTENANCE",
        ],
        required: true,
      },
      startedAt: Date,
      endedAt: Date,
      downtimeMs: Number,

      note: String,
    },
    { timestamps: true },
  ),
);
