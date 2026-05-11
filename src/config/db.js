const mongoose = require("mongoose");
const seed = require("./seed"); // 🔥 thêm

module.exports = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ MongoDB connected");

  await seed();
};
