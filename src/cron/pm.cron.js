const cron = require("node-cron");
const mongoose = require("mongoose");

const MaintenancePlan = require("../models/MaintenancePlan");
const MaintenancePlanLog = require("../models/MaintenancePlanLog");
const WorkOrder = require("../models/WorkOrder");
const ChecklistTemplate = require("../models/ChecklistTemplate");
const Asset = require("../models/Asset");

const { calculateNextRun } = require("../utils/pm.util");
const { assignAssetsToWorkOrder } = require("../utils/assetAssign.util");

const BLOCKED_STATUSES = ["IN_USE", "MAINTENANCE"];

/**
 * ⏰ Chạy mỗi ngày 01:00
 */
cron.schedule("0 1 * * *", async () => {
  console.log("⏰ PM CRON RUN", new Date().toISOString());

  const now = new Date();

  // 1️⃣ Lấy các plan đến hạn
  const plans = await MaintenancePlan.find({
    isActive: true,
    nextRunAt: { $lte: now },
  });

  for (const plan of plans) {
    /**
     * 🚫 2️⃣ CHẶN CHẠY NHIỀU LẦN TRONG CÙNG 1 NGÀY
     * (DÙ SUCCESS HAY SKIPPED)
     */
    if (
      plan.lastRunAt &&
      new Date(plan.lastRunAt).toDateString() === now.toDateString()
    ) {
      continue;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      /**
       * 🚦 3️⃣ CHECK ASSET BUSY
       */
      const assets = await Asset.find({ _id: { $in: plan.assets } }, null, {
        session,
      });

      const blockedAssets = assets.filter((a) =>
        BLOCKED_STATUSES.includes(a.status),
      );

      /**
       * ⏭ 4️⃣ SKIPPED_ASSET_BUSY (CHỈ 1 LẦN / NGÀY)
       */
      if (blockedAssets.length > 0) {
        await MaintenancePlanLog.create(
          [
            {
              maintenancePlan: plan._id,
              runAt: now,
              status: "SKIPPED_ASSET_BUSY",
              blockedAssets: blockedAssets.map((a) => a._id),
              triggeredBy: null, // CRON
            },
          ],
          { session },
        );

        plan.lastRunAt = now;
        plan.lastRunStatus = "SKIPPED_ASSET_BUSY";
        plan.nextRunAt = calculateNextRun(plan.nextRunAt, plan.frequency);
        await plan.save({ session });

        await session.commitTransaction();
        session.endSession();
        continue;
      }

      /**
       * 🔒 5️⃣ LOCK PLAN (ANTI DUPLICATE)
       */
      const locked = await MaintenancePlan.findOneAndUpdate(
        {
          _id: plan._id,
          lastRunAt: { $ne: now },
        },
        {},
        { new: true, session },
      );

      if (!locked) {
        await session.abortTransaction();
        session.endSession();
        continue;
      }

      /**
       * 📄 6️⃣ CREATE WORK ORDER
       */
      const [wo] = await WorkOrder.create(
        [
          {
            title: `[PM] ${plan.name}`,
            description: "Auto-generated preventive maintenance",
            createdBy: plan.createdBy,
            assignedAssets: plan.assets,
            maintenancePlan: plan._id,
            status: "ASSIGNED",
          },
        ],
        { session },
      );

      /**
       * 🔥 7️⃣ ASSIGN ASSET → IN_USE + AssetLog
       */
      await assignAssetsToWorkOrder({
        assetIds: plan.assets,
        workOrderId: wo._id,
        action: "ASSIGNED",
        note: "Assigned by maintenance plan",
        session,
      });

      /**
       * ✅ 8️⃣ SNAPSHOT CHECKLIST
       */
      if (plan.checklistTemplate) {
        const tpl = await ChecklistTemplate.findById(
          plan.checklistTemplate,
          null,
          { session },
        );

        if (tpl && tpl.isActive) {
          wo.checklist = tpl.items.map((i) => ({
            title: i.title,
            isDone: false,
          }));

          wo.checklistTemplate = {
            templateId: tpl._id,
            name: tpl.name,
          };

          await wo.save({ session });
        }
      }

      /**
       * 🧾 9️⃣ LOG SUCCESS
       */
      await MaintenancePlanLog.create(
        [
          {
            maintenancePlan: plan._id,
            runAt: now,
            status: "SUCCESS",
            createdWorkOrder: wo._id,
            triggeredBy: null,
          },
        ],
        { session },
      );

      plan.lastRunAt = now;
      plan.lastRunStatus = "SUCCESS";
      plan.nextRunAt = calculateNextRun(plan.nextRunAt, plan.frequency);
      await plan.save({ session });

      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();

      await MaintenancePlanLog.create({
        maintenancePlan: plan._id,
        runAt: new Date(),
        status: "FAILED",
        errorMessage: err.message,
        triggeredBy: null,
      });

      console.error("❌ PM FAILED:", err.message);
    }
  }
});
