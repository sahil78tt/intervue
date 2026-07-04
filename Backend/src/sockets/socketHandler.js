const roomUsers = {};

function addUserToRoom(shareLink, username, socketId) {
  if (!roomUsers[shareLink]) roomUsers[shareLink] = [];
  const alreadyIn = roomUsers[shareLink].some(function (u) {
    return u.socketId === socketId;
  });
  if (!alreadyIn) roomUsers[shareLink].push({ username, socketId });
}

function removeUserFromRoom(shareLink, socketId) {
  if (!roomUsers[shareLink]) return;
  roomUsers[shareLink] = roomUsers[shareLink].filter(function (u) {
    return u.socketId !== socketId;
  });
  if (roomUsers[shareLink].length === 0) delete roomUsers[shareLink];
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
      socket
        .to(shareLink)
        .emit("user-joined", { username, socketId: socket.id });
      io.to(shareLink).emit("room-users", roomUsers[shareLink]);
    });

    socket.on("leave-room", function (data) {
      const { shareLink, username } = data;
      socket.leave(shareLink);
      removeUserFromRoom(shareLink, socket.id);
      console.log(`👤 ${username} left room: ${shareLink}`);
      socket.to(shareLink).emit("user-left", { username, socketId: socket.id });
      io.to(shareLink).emit("room-users", roomUsers[shareLink] || []);
    });

    socket.on("problem-updated", function (data) {
      const { shareLink, problem_statement } = data;
      socket.to(shareLink).emit("problem-updated", {
        problem_statement: problem_statement,
      });
    });

    socket.on("chat:send", function (data) {
      const { shareLink, username, message } = data;
      if (!message || message.trim() === "") return;

      const messageObject = {
        id: Date.now() + "-" + socket.id,
        username: username,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      };

      console.log(`[${shareLink}] ${username}: ${message}`);
      io.to(shareLink).emit("chat:received", messageObject);
    });

    socket.on("webrtc:offer", function (data) {
      const { shareLink, offer } = data;
      console.log(`WebRTC offer from ${socket.id} in room ${shareLink}`);
      socket.to(shareLink).emit("webrtc:offer", {
        offer: offer,
        fromSocketId: socket.id,
      });
    });

    socket.on("webrtc:answer", function (data) {
      const { shareLink, answer } = data;
      console.log(`WebRTC answer from ${socket.id} in room ${shareLink}`);
      socket.to(shareLink).emit("webrtc:answer", {
        answer: answer,
        fromSocketId: socket.id,
      });
    });

    socket.on("webrtc:ice-candidate", function (data) {
      const { shareLink, candidate } = data;
      console.log(`ICE candidate from ${socket.id} in room ${shareLink}`);
      socket.to(shareLink).emit("webrtc:ice-candidate", {
        candidate: candidate,
        fromSocketId: socket.id,
      });
    });

    socket.on("webrtc:leave", function (data) {
      const { shareLink } = data;
      console.log(`WebRTC leave from ${socket.id} in room ${shareLink}`);
      socket.to(shareLink).emit("webrtc:leave", {
        fromSocketId: socket.id,
      });
    });

    socket.on("disconnect", function () {
      console.log("❌ User disconnected:", socket.id);
      const affectedRooms = removeUserFromAllRooms(socket.id);
      affectedRooms.forEach(function (shareLink) {
        socket.to(shareLink).emit("webrtc:leave", {
          fromSocketId: socket.id,
        });
        io.to(shareLink).emit("room-users", roomUsers[shareLink] || []);
      });
    });
  });
};
