const mongoose = require("mongoose");

module.exports = mongoose.model(
  "SparePart",
  new mongoose.Schema({
    name: String,
    sku: String,
    quantity: Number,
  })
);
