const mongoose = require("mongoose");

module.exports = mongoose.model(
  "AuditLog",
  new mongoose.Schema(
    {
      actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      target: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      action: {
        type: String,
        enum: ["ENABLE_TECHNICIAN", "DISABLE_TECHNICIAN"],
        required: true,
      },

      note: String,
    },
    { timestamps: true }
  )
);
