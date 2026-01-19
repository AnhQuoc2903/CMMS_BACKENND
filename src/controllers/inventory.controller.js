const SparePart = require("../models/SparePart");
const InventoryLog = require("../models/InventoryLog");

/* ================= CREATE ================= */
exports.create = async (req, res) => {
  const { name, sku, quantity = 0, minStock } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Name is required" });
  }

  if (sku) {
    const exists = await SparePart.findOne({ sku });
    if (exists) {
      return res.status(400).json({
        message: "SKU already exists",
      });
    }
  }

  // 1️⃣ CREATE SPARE PART
  const part = await SparePart.create({
    name,
    sku,
    quantity,
    ...(minStock !== undefined && { minStock }),
  });

  // 2️⃣ LOG INITIAL STOCK (NẾU CÓ SỐ LƯỢNG)
  if (quantity > 0) {
    await InventoryLog.create({
      sparePart: part._id,
      type: "IN",
      quantity: quantity,
      beforeQty: 0,
      afterQty: quantity,
      performedBy: req.user.id, // 👈 ai tạo
      note: "Initial stock",
    });
  }

  res.json(part);
};
/* ================= GET ALL ================= */
exports.getAll = async (req, res) => {
  const { status } = req.query;

  const filter = {};
  if (status) {
    filter.status = status;
  }

  const parts = await SparePart.find(filter).sort({ createdAt: -1 });

  const result = parts.map((p) => ({
    _id: p._id,
    name: p.name,
    sku: p.sku,
    status: p.status,
    quantity: p.quantity,
    reservedQuantity: p.reservedQuantity || 0,
    available: Math.max(p.quantity - (p.reservedQuantity || 0), 0), // ✅ QUAN TRỌNG
    createdAt: p.createdAt,
  }));

  res.json(result);
};

/* ================= GET DETAIL ================= */
exports.getDetail = async (req, res) => {
  const part = await SparePart.findById(req.params.id);
  if (!part) {
    return res.status(404).json({ message: "Spare part not found" });
  }
  res.json(part);
};

/* UPDATE (NO STATUS) */
exports.update = async (req, res) => {
  const { name, sku, minStock } = req.body;

  const part = await SparePart.findByIdAndUpdate(
    req.params.id,
    { name, sku, minStock },
    { new: true, runValidators: true }
  );

  if (!part) {
    return res.status(404).json({ message: "Spare part not found" });
  }

  res.json(part);
};

/* DISABLE */
exports.disable = async (req, res) => {
  const part = await SparePart.findById(req.params.id);
  if (!part) return res.status(404).json({ message: "Spare part not found" });

  part.status = "INACTIVE";
  await part.save();

  res.json(part);
};

/* ENABLE */
exports.enable = async (req, res) => {
  const part = await SparePart.findById(req.params.id);
  if (!part) return res.status(404).json({ message: "Spare part not found" });

  part.status = "ACTIVE";
  await part.save();

  res.json(part);
};

exports.stockIn = async (req, res) => {
  const { quantity, note } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: "Invalid quantity" });
  }

  const part = await SparePart.findById(req.params.id);
  if (!part) {
    return res.status(404).json({ message: "Spare part not found" });
  }

  const before = part.quantity;
  part.quantity += quantity;
  await part.save();

  await InventoryLog.create({
    sparePart: part._id,
    type: "IN",
    quantity,
    beforeQty: before,
    afterQty: part.quantity,
    performedBy: req.user.id,
    note,
  });

  res.json(part);
};

exports.getLowStock = async (req, res) => {
  const parts = await SparePart.find({
    status: "ACTIVE",
    minStock: { $ne: null },
    $expr: {
      $lte: [
        { $subtract: ["$quantity", { $ifNull: ["$reservedQuantity", 0] }] },
        "$minStock",
      ],
    },
  });

  res.json(parts);
};
