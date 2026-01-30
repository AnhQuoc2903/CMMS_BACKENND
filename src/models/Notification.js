const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true, // WO_ASSIGNED, WO_APPROVED, SLA_WARNING...
    },
    title: String,
    message: String,
    link: String,
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Notification", NotificationSchema);
