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
        enum: ["OPEN", "APPROVED", "REJECTED"],
        default: "OPEN",
      },

      handledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      rejectReason: String, // 👈 THÊM DÒNG NÀY
    },
    { timestamps: true }
  )
);
