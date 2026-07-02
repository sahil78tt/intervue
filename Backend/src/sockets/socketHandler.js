export const setupSocketHandlers = function (io) {
  io.on("connection", function (socket) {
    console.log("✅ User connected:", socket.id);

    socket.on("join-room", function (data) {
      const { shareLink, username } = data;

      socket.join(shareLink);
      console.log(`📥 ${username} joined room: ${shareLink}`);

      socket.to(shareLink).emit("user-joined", {
        username: username,
        socketId: socket.id,
      });
    });

    socket.on("leave-room", function (data) {
      const { shareLink, username } = data;

      socket.leave(shareLink);
      console.log(`📤 ${username} left room: ${shareLink}`);

      socket.to(shareLink).emit("user-left", {
        username: username,
        socketId: socket.id,
      });
    });

    socket.on("disconnect", function () {
      console.log("❌ User disconnected:", socket.id);
    });
  });
};
