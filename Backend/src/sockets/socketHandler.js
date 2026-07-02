const roomUsers = {};

function addUserToRoom(shareLink, username, socketId) {
  if (!roomUsers[shareLink]) {
    roomUsers[shareLink] = [];
  }

  const alreadyIn = roomUsers[shareLink].some(function (u) {
    return u.socketId === socketId;
  });

  if (!alreadyIn) {
    roomUsers[shareLink].push({ username, socketId });
  }
}

function removeUserFromRoom(shareLink, socketId) {
  if (!roomUsers[shareLink]) return;

  roomUsers[shareLink] = roomUsers[shareLink].filter(function (u) {
    return u.socketId !== socketId;
  });

  if (roomUsers[shareLink].length === 0) {
    delete roomUsers[shareLink];
  }
}

function removeUserFromAllRooms(socketId) {
  const affectedRooms = [];

  Object.keys(roomUsers).forEach(function (shareLink) {
    const wasInRoom = roomUsers[shareLink].some(function (u) {
      return u.socketId === socketId;
    });

    if (wasInRoom) {
      removeUserFromRoom(shareLink, socketId);
      affectedRooms.push(shareLink);
    }
  });

  return affectedRooms;
}

export const setupSocketHandlers = function (io) {
  io.on("connection", function (socket) {
    console.log("✅ User connected:", socket.id);

    socket.on("join-room", function (data) {
      const { shareLink, username } = data;

      socket.join(shareLink);
      addUserToRoom(shareLink, username, socket.id);

      console.log(`👤 ${username} joined room: ${shareLink}`);

      socket.to(shareLink).emit("user-joined", {
        username: username,
        socketId: socket.id,
      });

      io.to(shareLink).emit("room-users", roomUsers[shareLink]);
    });

    socket.on("leave-room", function (data) {
      const { shareLink, username } = data;

      socket.leave(shareLink);
      removeUserFromRoom(shareLink, socket.id);

      console.log(`👤 ${username} left room: ${shareLink}`);

      socket.to(shareLink).emit("user-left", {
        username: username,
        socketId: socket.id,
      });

      io.to(shareLink).emit("room-users", roomUsers[shareLink] || []);
    });

    socket.on("disconnect", function () {
      console.log("❌ User disconnected:", socket.id);

      const affectedRooms = removeUserFromAllRooms(socket.id);

      affectedRooms.forEach(function (shareLink) {
        io.to(shareLink).emit("room-users", roomUsers[shareLink] || []);
      });
    });
  });
};
