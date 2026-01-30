const Notification = require("../models/Notification");
const { sendCode } = require("../utils/sendCode");

exports.pushNotification = async ({
  users,
  type,
  title,
  message,
  entity,
  emailTemplate, // optional
}) => {
  if (!Array.isArray(users)) users = [users];

  // 1️⃣ In-app notification
  await Notification.insertMany(
    users.map((u) => ({
      user: u,
      type,
      title,
      message,
      entity,
    })),
  );

  // 2️⃣ Email (optional)
  if (emailTemplate) {
    for (const u of users) {
      await sendCode({
        to: u.email,
        ...emailTemplate,
      });
    }
  }
};
