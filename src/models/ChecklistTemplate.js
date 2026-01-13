// models/ChecklistTemplate.js
const mongoose = require("mongoose");

module.exports = mongoose.model(
  "ChecklistTemplate",
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
      },

      description: String,

      category: {
        type: String, // e.g. ELECTRICAL / MECHANICAL
      },

      items: [
        {
          title: {
            type: String,
            required: true,
          },
        },
      ],

      isActive: {
        type: Boolean,
        default: true,
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    { timestamps: true }
  )
);
