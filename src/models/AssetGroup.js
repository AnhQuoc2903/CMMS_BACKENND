const mongoose = require("mongoose");

const AssetGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    description: String,
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("AssetGroup", AssetGroupSchema);
