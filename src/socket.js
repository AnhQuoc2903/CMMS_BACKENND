const { Server } = require("socket.io");

let io;

exports.initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // sau này khóa domain
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("join", (userId) => {
      socket.join(`user:${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Socket disconnected:", socket.id);
    });
  });

  return io;
};

exports.getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};
