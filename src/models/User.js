const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const ROLES = require("../config/roles");

const schema = new mongoose.Schema(
  {
    name: String,

    email: {
      type: String,
      unique: true,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },

    // 👇 chỉ TECHNICIAN mới dùng
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  { timestamps: true },
);

schema.pre("save", async function () {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
});

schema.methods.compare = function (pw) {
  return bcrypt.compare(pw, this.password);
};

module.exports = mongoose.model("User", schema);
