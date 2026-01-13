require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const seed = require("./config/seed");

(async () => {
  await connectDB();
  await seed();

  app.listen(process.env.PORT || 5000, () => console.log("🚀 Server running"));
})();
