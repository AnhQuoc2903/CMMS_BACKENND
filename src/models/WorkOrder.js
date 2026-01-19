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
          "ON_HOLD",
          "COMPLETED",
          "REVIEWED",
          "VERIFIED",
          "CLOSED",
          "REJECTED",
          "CANCELLED",
        ],
        default: "OPEN",
      },

      priority: {
        type: String,
        enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        default: "MEDIUM",
      },

      slaHours: {
        type: Number,
      },

      dueAt: {
        type: Date,
      },

      holdReason: {
        type: String,
        trim: true,
      },

      holdAt: {
        type: Date,
      },

      slaPausedAt: Date,
      slaPausedTotal: {
        type: Number,
        default: 0,
      },

      cancelReason: {
        type: String,
      },

      cancelledAt: {
        type: Date,
      },

      cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      review: {
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reviewedAt: Date,
        note: String,
      },

      reviewRejections: [
        {
          rejectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          rejectedAt: Date,
          reason: String,
        },
      ],

      verification: {
        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        verifiedAt: Date,
      },

      verificationRejections: [
        {
          rejectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          rejectedAt: Date,
          reason: String,
        },
      ],

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

      maintenancePlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "MaintenancePlan",
      },

      // ===== INVENTORY USAGE =====
      usedParts: [
        {
          part: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SparePart",
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
            min: 1,
          },
        },
      ],

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
