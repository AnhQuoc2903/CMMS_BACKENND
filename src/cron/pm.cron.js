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
 * 🔥 RUN EVERY MINUTE (KHÔNG MISS JOB)
 */
cron.schedule("* * * * *", async () => {
  const now = new Date();
  console.log("⏱ PM CRON:", now.toISOString());

  const plans = await MaintenancePlan.find({
    isActive: true,
    nextRunAt: { $lte: now },
  });

  for (const plan of plans) {
    // ❌ tránh chạy nhiều lần trong cùng ngày
    // if (
    //   plan.lastRunAt &&
    //   new Date(plan.lastRunAt).toDateString() === now.toDateString()
    // ) {
    //   continue;
    // }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      console.log("🚀 RUN PLAN:", plan.name);

      /**
       * 🚦 CHECK ASSET BUSY
       */
      const assets = await Asset.find({ _id: { $in: plan.assets } }, null, {
        session,
      });

      const blockedAssets = assets.filter((a) =>
        BLOCKED_STATUSES.includes(a.status),
      );

      /**
       * ⏭ SKIP nếu asset đang bận
       */
      if (blockedAssets.length > 0) {
        await MaintenancePlanLog.create(
          [
            {
              maintenancePlan: plan._id,
              runAt: now,
              status: "SKIPPED_ASSET_BUSY",
              blockedAssets: blockedAssets.map((a) => a._id),
              triggeredBy: null,
            },
          ],
          { session },
        );

        plan.lastRunAt = now;
        plan.lastRunStatus = "SKIPPED_ASSET_BUSY";

        // ✅ FIX QUAN TRỌNG
        plan.nextRunAt = calculateNextRun(plan.nextRunAt, plan);

        await plan.save({ session });

        await session.commitTransaction();
        session.endSession();
        continue;
      }

      /**
       * 🔒 LOCK tránh duplicate
       */
      const locked = await MaintenancePlan.findOneAndUpdate(
        {
          _id: plan._id,
          lastRunStatus: { $ne: "RUNNING" },
        },
        {
          $set: {
            lastRunStatus: "RUNNING",
          },
        },
        { new: true, session },
      );

      if (!locked) {
        await session.abortTransaction();
        session.endSession();
        continue;
      }

      /**
       * 📄 CREATE WORK ORDER
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
       * 🔥 ASSIGN ASSET
       */
      await assignAssetsToWorkOrder({
        assetIds: plan.assets,
        workOrderId: wo._id,
        action: "ASSIGNED",
        note: "Assigned by maintenance plan",
        session,
      });

      /**
       * ✅ SNAPSHOT CHECKLIST
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
       * 🧾 LOG SUCCESS
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

      /**
       * 🔁 UPDATE PLAN
       */
      plan.lastRunAt = now;
      plan.lastRunStatus = "SUCCESS";

      // ✅ FIX QUAN TRỌNG NHẤT
      plan.nextRunAt = calculateNextRun(plan.nextRunAt, plan);

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
