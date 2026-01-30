// src/events/notification.events.js
const eventBus = require("./eventBus");
const User = require("../models/User");
const { sendCode } = require("../utils/sendCode");
const tpl = require("./emailTemplates");
const push = require("../utils/pushNotification");

/* ======================================================
   WORK ORDER APPROVED
====================================================== */
eventBus.on("WORK_ORDER_APPROVED", async ({ workOrder }) => {
  // 🔔 creator
  await push({
    userId: workOrder.createdBy,
    payload: {
      type: "WO_APPROVED",
      title: "Work Order Approved",
      message: workOrder.title,
      link: `/work-orders/${workOrder._id}`,
    },
  });

  // 📧 admin
  const admins = await User.find({
    role: { $in: ["SUPER_ADMIN", "BUILDING_MANAGER"] },
  });

  for (const a of admins) {
    await sendCode({
      to: a.email,
      ...tpl.woApproved(workOrder),
    });
  }
});

/* ======================================================
   TECHNICIAN ASSIGNED
====================================================== */
eventBus.on("TECHNICIAN_ASSIGNED", async ({ workOrder, technicians }) => {
  for (const t of technicians) {
    await push({
      userId: t._id,
      payload: {
        type: "WO_ASSIGNED",
        title: "New Work Order Assigned",
        message: workOrder.title,
        link: `/work-orders/${workOrder._id}`,
      },
    });

    await sendCode({
      to: t.email,
      ...tpl.techAssigned(workOrder),
    });
  }
});

/* ======================================================
   WORK ORDER STARTED
====================================================== */
eventBus.on("WORK_ORDER_STARTED", async ({ workOrder }) => {
  for (const techId of workOrder.assignedTechnicians || []) {
    await push({
      userId: techId,
      payload: {
        type: "WO_STARTED",
        title: "Work Order Started",
        message: workOrder.title,
        link: `/work-orders/${workOrder._id}`,
      },
    });
  }
});

/* ======================================================
   WORK ORDER COMPLETED
====================================================== */
eventBus.on("WORK_ORDER_COMPLETED", async ({ workOrder }) => {
  await push({
    userId: workOrder.createdBy,
    payload: {
      type: "WO_COMPLETED",
      title: "Work Order Completed",
      message: workOrder.title,
      link: `/work-orders/${workOrder._id}`,
    },
  });
});

/* ======================================================
   REVIEWED
====================================================== */
eventBus.on("WORK_ORDER_REVIEWED", async ({ workOrder }) => {
  await push({
    userId: workOrder.createdBy,
    payload: {
      type: "WO_REVIEWED",
      title: "Work Order Reviewed",
      message: workOrder.title,
      link: `/work-orders/${workOrder._id}`,
    },
  });
});

/* ======================================================
   VERIFIED
====================================================== */
eventBus.on("WORK_ORDER_VERIFIED", async ({ workOrder }) => {
  await push({
    userId: workOrder.createdBy,
    payload: {
      type: "WO_VERIFIED",
      title: "Work Order Verified",
      message: workOrder.title,
      link: `/work-orders/${workOrder._id}`,
    },
  });
});

/* ======================================================
   SLA WARNING
====================================================== */
eventBus.on("SLA_WARNING", async ({ workOrder }) => {
  const targets = new Set([
    workOrder.createdBy.toString(),
    ...(workOrder.assignedTechnicians || []).map((id) => id.toString()),
  ]);

  for (const uid of targets) {
    await push({
      userId: uid,
      payload: {
        type: "SLA_WARNING",
        title: "SLA Warning",
        message: `WO "${workOrder.title}" nearing SLA`,
        link: `/work-orders/${workOrder._id}`,
      },
    });
  }
});

/* ======================================================
   ON HOLD
====================================================== */
eventBus.on("WORK_ORDER_ON_HOLD", async ({ workOrder, reason }) => {
  const targets = new Set([
    workOrder.createdBy.toString(),
    ...(workOrder.assignedTechnicians || []).map((id) => id.toString()),
  ]);

  for (const uid of targets) {
    await push({
      userId: uid,
      payload: {
        type: "WO_ON_HOLD",
        title: "Work Order On Hold",
        message: reason,
        link: `/work-orders/${workOrder._id}`,
      },
    });
  }
});

/* ======================================================
   RESUMED
====================================================== */
eventBus.on("WORK_ORDER_RESUMED", async ({ workOrder }) => {
  for (const techId of workOrder.assignedTechnicians || []) {
    await push({
      userId: techId,
      payload: {
        type: "WO_RESUMED",
        title: "Work Order Resumed",
        message: workOrder.title,
        link: `/work-orders/${workOrder._id}`,
      },
    });
  }
});

/* ======================================================
   REWORK
====================================================== */
eventBus.on("WORK_ORDER_REWORK", async ({ workOrder, stage }) => {
  for (const techId of workOrder.assignedTechnicians || []) {
    await push({
      userId: techId,
      payload: {
        type: "WO_REWORK",
        title: "Work Order Rework Required",
        message: `Returned at ${stage} stage`,
        link: `/work-orders/${workOrder._id}`,
      },
    });
  }
});

/* ======================================================
   CANCELLED
====================================================== */
eventBus.on("WORK_ORDER_CANCELLED", async ({ workOrder, reason }) => {
  await push({
    userId: workOrder.createdBy,
    payload: {
      type: "WO_CANCELLED",
      title: "Work Order Cancelled",
      message: reason || workOrder.title,
      link: `/work-orders/${workOrder._id}`,
    },
  });
});

/* ======================================================
   CLOSED
====================================================== */
eventBus.on("WORK_ORDER_CLOSED", async ({ workOrder }) => {
  await push({
    userId: workOrder.createdBy,
    payload: {
      type: "WO_CLOSED",
      title: "Work Order Closed",
      message: workOrder.title,
      link: `/work-orders/${workOrder._id}`,
    },
  });
});

/* ======================================================
   TENANT REQUEST SUBMITTED
====================================================== */
eventBus.on("TENANT_REQUEST_SUBMITTED", async ({ tenantRequest }) => {
  const admins = await User.find({
    role: { $in: ["SUPER_ADMIN", "BUILDING_MANAGER"] },
  });

  for (const u of admins) {
    await push({
      userId: u._id,
      payload: {
        type: "TENANT_SUBMITTED",
        title: "New Tenant Request",
        message: tenantRequest.title,
        link: "/tenant-requests",
      },
    });

    await sendCode({
      to: u.email,
      ...tpl.tenantRequest(tenantRequest),
    });
  }
});

/* ======================================================
   TENANT BUILDING APPROVED
====================================================== */
eventBus.on("TENANT_REQUEST_BUILDING_APPROVED", async ({ tenantRequest }) => {
  const admins = await User.find({
    role: { $in: ["SUPER_ADMIN", "BUILDING_MANAGER"] },
  });

  for (const u of admins) {
    await push({
      userId: u._id,
      payload: {
        type: "TENANT_APPROVED",
        title: "Tenant Request Approved (Building)",
        message: tenantRequest.title,
        link: "/tenant-requests",
      },
    });
  }
});

/* ======================================================
   TENANT MSP REVIEWED
====================================================== */
eventBus.on("TENANT_REQUEST_MSP_REVIEWED", async ({ tenantRequest }) => {
  if (!tenantRequest.mspReview?.reviewedBy) return;

  await push({
    userId: tenantRequest.mspReview.reviewedBy,
    payload: {
      type: "TENANT_MSP_REVIEWED",
      title: "Tenant Request Reviewed",
      message: tenantRequest.title,
      link: "/tenant-requests",
    },
  });
});

/* ======================================================
   TENANT FINAL APPROVED
====================================================== */
eventBus.on(
  "TENANT_REQUEST_FINAL_APPROVED",
  async ({ tenantRequest, workOrder }) => {
    const admins = await User.find({
      role: { $in: ["SUPER_ADMIN", "BUILDING_MANAGER"] },
    });

    for (const a of admins) {
      await push({
        userId: a._id,
        payload: {
          type: "TENANT_FINAL_APPROVED",
          title: "Tenant Request Approved",
          message: tenantRequest.title,
          link: `/work-orders/${workOrder._id}`,
        },
      });
    }
  },
);

/* ======================================================
   TENANT REJECTED
====================================================== */
eventBus.on("TENANT_REQUEST_REJECTED", async ({ tenantRequest, reason }) => {
  if (!tenantRequest.handledBy) return;

  await push({
    userId: tenantRequest.handledBy,
    payload: {
      type: "TENANT_REJECTED",
      title: "Tenant Request Rejected",
      message: reason,
      link: "/tenant-requests",
    },
  });
});
