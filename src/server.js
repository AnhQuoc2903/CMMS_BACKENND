require("dotenv").config();
const http = require("http");
const cron = require("node-cron");

const app = require("./app");
const connectDB = require("./config/db");
const seed = require("./config/seed");
const { initSocket } = require("./socket");

const checkSLABreach = require("./cron/slaBreach.cron");

// import cron & event (chỉ cần require)
require("./cron/pm.cron");
require("./events/notification.events");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1️⃣ Connect DB
    await connectDB();

    // 2️⃣ SEED – CHỈ chạy khi bật flag
    if (process.env.RUN_SEED === "true") {
      await seed();
      console.log("✅ Seed data completed");
    }

    // 3️⃣ Create HTTP server
    const server = http.createServer(app);

    // 4️⃣ Init socket.io
    initSocket(server);

    // 5️⃣ Cron SLA
    cron.schedule("*/5 * * * *", checkSLABreach);

    // 6️⃣ Listen (CHỈ 1 LẦN)
    server.listen(PORT, () => {
      console.log(`🚀 CMMS Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Server failed to start:", err);
    process.exit(1);
  }
};

startServer();
