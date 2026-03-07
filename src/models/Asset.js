const mongoose = require("mongoose");

module.exports = mongoose.model(
  "Asset",
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      code: {
        type: String,
        required: true,
        unique: true,
      },

      category: String,

      location: String,

      description: String,

      status: {
        type: String,
        enum: ["AVAILABLE", "IN_USE", "MAINTENANCE"],
        default: "AVAILABLE",
      },

      group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AssetGroup",
        index: true,
      },
    },
    { timestamps: true },
  ),
);
