const mongoose = require("mongoose");

module.exports = mongoose.model(
  "InventoryBatch",
  new mongoose.Schema(
    {
      sparePart: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SparePart",
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
      },

      remaining: {
        type: Number,
        required: true,
      },

      cost: Number,

      receivedAt: {
        type: Date,
        default: Date.now,
      },
    },
    { timestamps: true },
  ),
);
