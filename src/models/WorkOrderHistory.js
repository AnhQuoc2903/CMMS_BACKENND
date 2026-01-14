const mongoose = require("mongoose");

const WorkOrderHistorySchema = new mongoose.Schema(
  {
    workOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkOrder",
      required: true,
    },
    action: {
      type: String,
      enum: ["START", "CHECKLIST_UPDATE", "UPLOAD_PHOTO", "SIGNED", "REWORK"],
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    note: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("WorkOrderHistory", WorkOrderHistorySchema);
