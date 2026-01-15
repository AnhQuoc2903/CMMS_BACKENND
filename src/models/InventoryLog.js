const mongoose = require("mongoose");

const InventoryLogSchema = new mongoose.Schema(
  {
    sparePart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SparePart",
      required: true,
    },

    type: {
      type: String,
      enum: ["IN", "OUT", "ROLLBACK"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
    },

    beforeQty: {
      type: Number,
      required: true,
    },

    afterQty: {
      type: Number,
      required: true,
    },

    workOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkOrder",
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    note: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryLog", InventoryLogSchema);
