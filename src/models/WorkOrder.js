// models/WorkOrder.js
const mongoose = require("mongoose");

module.exports = mongoose.model(
  "WorkOrder",
  new mongoose.Schema(
    {
      /* ===== BASIC INFO ===== */
      title: {
        type: String,
        required: true,
      },

      description: String,

      /* ===== CREATOR ===== */
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      /* ===== STATUS ===== */
      status: {
        type: String,
        enum: [
          "OPEN",
          "PENDING_APPROVAL",
          "APPROVED",
          "ASSIGNED",
          "IN_PROGRESS",
          "COMPLETED",
          "CLOSED",
          "REJECTED",
        ],
        default: "OPEN",
      },

      /* ===== APPROVAL ===== */
      approval: {
        approvedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        approvedAt: Date,

        rejectedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rejectedAt: Date,

        rejectReason: String,
      },

      /* ===== ASSIGNMENT ===== */
      assignedTechnicians: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      ],

      assignedAssets: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Asset",
        },
      ],

      assignedAt: Date,

      /* ===== EXECUTION ===== */
      checklist: {
        type: [
          {
            title: String,
            isDone: { type: Boolean, default: false },
          },
        ],
        default: [],
      },

      photos: {
        type: [{ url: String }],
        default: [],
      },

      signature: {
        url: String,
      },

      completedAt: Date,

      /* ===== CLOSURE ===== */
      closedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      tenantRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TenantRequest",
      },

      closedAt: Date,
    },
    { timestamps: true }
  )
);
