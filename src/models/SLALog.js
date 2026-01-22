const mongoose = require("mongoose");

module.exports = mongoose.model(
  "SLALog",
  new mongoose.Schema(
    {
      workOrder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "WorkOrder",
        required: true,
      },
      type: {
        type: String,
        enum: [
          "START", // SLA bắt đầu
          "PAUSE", // ON_HOLD
          "RESUME", // resume từ hold
          "CHECKPOINT", // start / review / verify
          "BREACH", // quá hạn
          "REWORK", // bị reject
          "CANCEL", // hủy WO
          "CLOSE", // đóng WO đúng hạn
        ],
        required: true,
      },
      at: {
        type: Date,
        default: Date.now,
      },
      note: String,
    },
    { timestamps: true },
  ),
);
