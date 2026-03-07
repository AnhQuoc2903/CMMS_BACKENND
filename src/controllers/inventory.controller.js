const SparePart = require("../models/SparePart");
const InventoryLog = require("../models/InventoryLog");
const InventoryBatch = require("../models/InventoryBatch");

/* ================= CREATE ================= */
exports.create = async (req, res) => {
  const {
    name,
    sku,
    quantity = 0,
    minStock,
    parentPart,
    specs,
    inventoryMethod,
    compatibleAssets,
  } = req.body;

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

  const part = await SparePart.create({
    name,
    sku,
    quantity,
    minStock,
    parentPart: parentPart || null,
    specs: specs || [],
    inventoryMethod: inventoryMethod || "FIFO",
    compatibleAssets: compatibleAssets || [],
  });

  if (quantity > 0) {
    await InventoryBatch.create({
      sparePart: part._id,
      quantity,
      remaining: quantity,
    });

    await InventoryLog.create({
      sparePart: part._id,
      type: "IN",
      quantity,
      beforeQty: 0,
      afterQty: quantity,
      performedBy: req.user.id,
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

  const parts = await SparePart.find(filter)
    .populate("parentPart", "name")
    .sort({ createdAt: -1 });

  res.json(parts);
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
  const {
    name,
    sku,
    minStock,
    parentPart,
    specs,
    inventoryMethod,
    compatibleAssets,
  } = req.body;

  const part = await SparePart.findById(req.params.id);

  if (!part) {
    return res.status(404).json({ message: "Spare part not found" });
  }

  part.name = name ?? part.name;
  part.sku = sku ?? part.sku;
  part.minStock = minStock ?? part.minStock;
  part.parentPart = parentPart ?? null;
  part.specs = specs ?? [];
  part.inventoryMethod = inventoryMethod ?? part.inventoryMethod;
  part.compatibleAssets = compatibleAssets ?? part.compatibleAssets;
  await part.save();

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

  // update stock
  part.quantity += quantity;
  await part.save();

  // create batch
  await InventoryBatch.create({
    sparePart: part._id,
    quantity,
    remaining: quantity,
  });

  // log
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

exports.getPartTree = async (req, res) => {
  const parts = await SparePart.find();

  const map = {};

  parts.forEach((p) => {
    map[p._id] = { ...p.toObject(), children: [] };
  });

  const tree = [];

  parts.forEach((p) => {
    if (p.parentPart) {
      map[p.parentPart]?.children.push(map[p._id]);
    } else {
      tree.push(map[p._id]);
    }
  });

  res.json(tree);
};

exports.getBatches = async (req, res) => {
  const batches = await InventoryBatch.find({
    sparePart: req.params.id,
  }).sort({ receivedAt: -1 });

  res.json(batches);
};

exports.getPartsForAsset = async (req, res) => {
  const parts = await SparePart.find({
    compatibleAssets: req.params.assetId,
  });

  res.json(parts);
};

exports.getInventoryHistory = async (req, res) => {
  const logs = await InventoryLog.find({
    sparePart: req.params.id,
  })
    .populate("performedBy", "name")
    .sort({ createdAt: -1 });

  res.json(logs);
};
