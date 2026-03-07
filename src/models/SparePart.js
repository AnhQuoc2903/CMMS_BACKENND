const mongoose = require("mongoose");

const SparePartSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      unique: true,
      sparse: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    minStock: {
      type: Number,
      default: 5,
      min: 0,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    reservedQuantity: {
      type: Number,
      default: 0,
    },

    /* FIFO / LIFO */
    inventoryMethod: {
      type: String,
      enum: ["FIFO", "LIFO"],
      default: "FIFO",
    },

    /* component hierarchy */
    parentPart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SparePart",
      default: null,
      index: true,
    },

    /* technical specs */
    specs: [
      {
        key: {
          type: String,
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
        unit: String,
      },
    ],

    /* compatible assets */
    compatibleAssets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Asset",
      },
    ],
  },
  {
    timestamps: true,
  },
);

/* virtual available stock */
SparePartSchema.virtual("available").get(function () {
  return Math.max(this.quantity - (this.reservedQuantity || 0), 0);
});

SparePartSchema.set("toJSON", { virtuals: true });
SparePartSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("SparePart", SparePartSchema);
