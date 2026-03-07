const InventoryBatch = require("../models/InventoryBatch");

exports.consumeBatch = async ({ partId, quantity, method }) => {
  const sort = method === "FIFO" ? { receivedAt: 1 } : { receivedAt: -1 };

  const batches = await InventoryBatch.find({
    sparePart: partId,
    remaining: { $gt: 0 },
  }).sort(sort);

  let remain = quantity;

  for (const b of batches) {
    if (remain <= 0) break;

    const used = Math.min(b.remaining, remain);

    b.remaining -= used;
    remain -= used;

    await b.save();
  }

  if (remain > 0) {
    throw new Error("Not enough inventory");
  }
};
