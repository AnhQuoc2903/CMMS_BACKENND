const cron = require("node-cron");
const mongoose = require("mongoose");
const MaintenancePlan = require("../models/MaintenancePlan");
const WorkOrder = require("../models/WorkOrder");
const ChecklistTemplate = require("../models/ChecklistTemplate");
const Asset = require("../models/Asset");
const { calculateNextRun } = require("../utils/pm.util");

const BLOCKED_STATUSES = ["IN_USE", "MAINTENANCE"];

cron.schedule("0 1 * * *", async () => {
  console.log("⏰ PM CRON RUN", new Date().toISOString());

  const now = new Date();

  const plans = await MaintenancePlan.find({
    isActive: true,
    nextRunAt: { $lte: now },
  });

  for (const plan of plans) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      /* =========================
         🔒 LOCK PLAN (ANTI DUP)
      ========================= */
      const locked = await MaintenancePlan.findOneAndUpdate(
        {
          _id: plan._id,
          nextRunAt: { $lte: now },
        },
        {
          $set: {
            nextRunAt: calculateNextRun(plan.nextRunAt, plan.frequency),
            lastRunAt: now,
            lastRunStatus: "RUNNING",
          },
        },
        { new: true, session }
      );

      if (!locked) {
        await session.abortTransaction();
        session.endSession();
        continue;
      }

      /* =========================
         🚦 CHECK ASSET STATUS
      ========================= */
      const assets = await Asset.find({ _id: { $in: plan.assets } }, null, {
        session,
      });

      const blocked = assets.filter((a) => BLOCKED_STATUSES.includes(a.status));

      if (blocked.length > 0) {
        locked.lastRunStatus = "SKIPPED_ASSET_BUSY";
        await locked.save({ session });

        await session.commitTransaction();
        session.endSession();

        console.log(
          `⏭ SKIP PM [${plan.name}] – assets busy:`,
          blocked.map((a) => a.name).join(", ")
        );
        continue;
      }

      /* =========================
         📄 CREATE WORK ORDER
      ========================= */
      const wo = await WorkOrder.create(
        [
          {
            title: `[PM] ${plan.name}`,
            description: "Auto-generated preventive maintenance",
            createdBy: plan.createdBy,
            assignedAssets: plan.assets,
            maintenancePlan: plan._id,
            status: "APPROVED",
          },
        ],
        { session }
      );

      /* =========================
         ✅ CHECKLIST SNAPSHOT
      ========================= */
      if (plan.checklistTemplate) {
        const tpl = await ChecklistTemplate.findById(
          plan.checklistTemplate,
          null,
          { session }
        );

        if (tpl && tpl.isActive) {
          wo[0].checklist = tpl.items.map((i) => ({
            title: i.title,
            isDone: false,
          }));

          wo[0].checklistTemplate = {
            templateId: tpl._id,
            name: tpl.name,
          };

          await wo[0].save({ session });
        }
      }

      locked.lastRunStatus = "SUCCESS";
      await locked.save({ session });

      await session.commitTransaction();
      session.endSession();

      console.log(`✅ PM WO created: ${wo[0].title}`);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();

      await MaintenancePlan.findByIdAndUpdate(plan._id, {
        lastRunAt: new Date(),
        lastRunStatus: "FAILED",
      });

      console.error(`❌ PM FAILED: ${plan.name}`, err.message);
    }
  }
});
