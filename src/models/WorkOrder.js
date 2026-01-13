const mongoose = require("mongoose");

module.exports = mongoose.model(
  "WorkOrder",
  new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
      },

      description: String,

      // 👤 ai tạo work order
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      // 👷 kỹ thuật viên được giao (NHIỀU)
      assignedTechnicians: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],

      status: {
        type: String,
        enum: ["OPEN", "IN_PROGRESS", "DONE"],
        default: "OPEN",
      },

      checklist: {
        type: [
          {
            title: String,
            isDone: Boolean,
          },
        ],
        default: [],
      },

      photos: {
        type: [{ url: String }],
        default: [],
      },

      signature: {
        url: String,
      },

      // 🧰 asset dùng cho work order
      assignedAssets: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Asset",
        },
      ],
    },
    { timestamps: true }
  )
);
