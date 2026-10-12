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
 * 🔥 CHECK EVERY MINUTE
 *
 * Cron chạy mỗi phút chỉ để kiểm tra nextRunAt.
 * PM chỉ chạy khi nextRunAt <= now.
 */
cron.schedule("* * * * *", async () => {
  const now = new Date();

  console.log("⏱ PM CRON:", now.toISOString());

  try {
    const plans = await MaintenancePlan.find({
      isActive: true,
      nextRunAt: { $lte: now },
    });

    for (const plan of plans) {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        /**
         * 🔒 LOCK TRƯỚC KHI CHECK ASSET
         *
         * Quan trọng:
         * Chỉ process plan nếu nó vẫn đang due.
         */
        const locked = await MaintenancePlan.findOneAndUpdate(
          {
            _id: plan._id,
            isActive: true,
            nextRunAt: { $lte: now },
            lastRunStatus: { $ne: "RUNNING" },
          },
          {
            $set: {
              lastRunStatus: "RUNNING",
            },
          },
          {
            new: true,
            session,
          },
        );

        if (!locked) {
          await session.abortTransaction();
          session.endSession();
          continue;
        }

        console.log("🚀 RUN PLAN:", locked.name);

        /**
         * 🚦 CHECK ASSET BUSY
         */
        const assets = await Asset.find(
          {
            _id: { $in: locked.assets },
          },
          null,
          { session },
        );

        const blockedAssets = assets.filter((a) =>
          BLOCKED_STATUSES.includes(a.status),
        );

        /**
         * ⏭ SKIP nếu asset đang bận
         */
        if (blockedAssets.length > 0) {
          console.log("⏭ SKIPPED ASSET BUSY:", locked.name);

          await MaintenancePlanLog.create(
            [
              {
                maintenancePlan: locked._id,
                runAt: now,
                status: "SKIPPED_ASSET_BUSY",
                blockedAssets: blockedAssets.map((a) => a._id),
                triggeredBy: null,
              },
            ],
            { session },
          );

          locked.lastRunAt = now;
          locked.lastRunStatus = "SKIPPED_ASSET_BUSY";

          /**
           * 🔁 ĐẨY SANG LẦN CHẠY TIẾP THEO
           */
          locked.nextRunAt = calculateNextRun(locked.nextRunAt, locked);

          await locked.save({ session });

          console.log("📅 NEXT RUN:", locked.nextRunAt.toISOString());

          await session.commitTransaction();
          session.endSession();

          continue;
        }

        /**
         * 📄 CREATE WORK ORDER
         */
        const [wo] = await WorkOrder.create(
          [
            {
              title: `[PM] ${locked.name}`,
              description: "Auto-generated preventive maintenance",
              createdBy: locked.createdBy,
              assignedAssets: locked.assets,
              maintenancePlan: locked._id,
              status: "ASSIGNED",
            },
          ],
          { session },
        );

        /**
         * 🔥 ASSIGN ASSET
         */
        await assignAssetsToWorkOrder({
          assetIds: locked.assets,
          workOrderId: wo._id,
          action: "ASSIGNED",
          note: "Assigned by maintenance plan",
          session,
        });

        /**
         * ✅ SNAPSHOT CHECKLIST
         */
        if (locked.checklistTemplate) {
          const tpl = await ChecklistTemplate.findById(
            locked.checklistTemplate,
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
              maintenancePlan: locked._id,
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
        locked.lastRunAt = now;
        locked.lastRunStatus = "SUCCESS";

        locked.nextRunAt = calculateNextRun(locked.nextRunAt, locked);

        await locked.save({ session });

        console.log(
          "✅ PM SUCCESS:",
          locked.name,
          "NEXT:",
          locked.nextRunAt.toISOString(),
        );

        await session.commitTransaction();
        session.endSession();
      } catch (err) {
        await session.abortTransaction();
        session.endSession();

        console.error("❌ PM FAILED:", plan.name, err.message);

        try {
          await MaintenancePlanLog.create({
            maintenancePlan: plan._id,
            runAt: new Date(),
            status: "FAILED",
            errorMessage: err.message,
            triggeredBy: null,
          });

          await MaintenancePlan.findByIdAndUpdate(plan._id, {
            lastRunAt: now,
            lastRunStatus: "FAILED",
          });
        } catch (logErr) {
          console.error("❌ PM ERROR LOG FAILED:", logErr.message);
        }
      }
    }
  } catch (err) {
    console.error("❌ PM CRON ERROR:", err.message);
  }
});
