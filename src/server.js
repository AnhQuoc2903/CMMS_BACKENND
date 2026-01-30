require("dotenv").config();
const cron = require("node-cron");

const app = require("./app");
const connectDB = require("./config/db");
const seed = require("./config/seed");

const http = require("http");

const { initSocket } = require("./socket");

const server = http.createServer(app);

const checkSLABreach = require("./cron/slaBreach.cron");
require("./cron/pm.cron");
require("./events/notification.events");

initSocket(server);

server.listen(process.env.PORT || 5000, () => {
  console.log("Server running");
});

(async () => {
  await connectDB();
  await seed();

  cron.schedule("*/5 * * * *", checkSLABreach);

  app.listen(process.env.PORT || 5000, () => console.log("🚀 Server running"));
})();
