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
      enum: [
        "CREATE",
        "SUBMIT",
        "APPROVE",
        "REJECT",
        "ASSIGN",
        "START",
        "HOLD",
        "RESUME",
        "REWORK",
        "COMPLETE",
        "REVIEW",
        "VERIFY",
        "CLOSE",
        "CANCEL",
      ],
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
