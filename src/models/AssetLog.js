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
        enum: ["ASSIGNED", "UNASSIGNED", "MAINTAINED", "AVAILABLE"],
        required: true,
      },
      note: String,
    },
    { timestamps: true }
  )
);
