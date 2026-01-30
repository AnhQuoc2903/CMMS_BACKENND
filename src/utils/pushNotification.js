const Notification = require("../models/Notification");
const { getIO } = require("../socket");

module.exports = async ({ userId, payload }) => {
  const io = getIO();

  const noti = await Notification.create({
    user: userId,
    ...payload,
  });

  io.to(`user:${userId}`).emit("notification:new", noti);

  return noti;
};
