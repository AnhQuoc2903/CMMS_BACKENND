// models/Asset.js
const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Asset",
  new mongoose.Schema(
    {
      name: String,
      code: String,
      category: String,
      location: String,

      status: {
        type: String,
        enum: ["AVAILABLE", "IN_USE", "MAINTENANCE"],
        default: "AVAILABLE",
      },
    },
    { timestamps: true }
  )
);
