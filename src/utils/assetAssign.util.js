// utils/assetAssign.util.js
const Asset = require("../models/Asset");
const AssetLog = require("../models/AssetLog");

exports.assignAssetsToWorkOrder = async ({
  assetIds,
  workOrderId,
  action = "ASSIGNED",
  note,
  session,
}) => {
  for (const assetId of assetIds) {
    await Asset.findByIdAndUpdate(
      assetId,
      { status: "IN_USE" },
      session ? { session } : {},
    );

    await AssetLog.create(
      [
        {
          asset: assetId,
          workOrder: workOrderId,
          action, // ✅ phải nằm trong enum
          note,
        },
      ],
      session ? { session } : {},
    );
  }
};
