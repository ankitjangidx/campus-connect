const { Server } = require("socket.io");
const {
  extractTokenFromCookieHeader,
  verifyAuthToken
} = require("./utils/auth");

let io;

function initializeSocket(httpServer, allowedOrigins) {
  io = new Server(httpServer, {
    cors: {
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin not allowed by Socket.IO"));
      }
    }
  });

  io.on("connection", (socket) => {
    try {
      const token = extractTokenFromCookieHeader(socket.handshake.headers.cookie || "");
      const payload = verifyAuthToken(token);
      const userId = Number.parseInt(payload.sub, 10);

      if (!userId) {
        socket.disconnect(true);
        return;
      }

      socket.join(`user:${userId}`);
    } catch (_error) {
      socket.disconnect(true);
    }
  });

  return io;
}

function emitToUsers(userIds, eventName, payload) {
  if (!io) {
    return;
  }

  [...new Set(userIds)].forEach((userId) => {
    io.to(`user:${userId}`).emit(eventName, payload);
  });
}

module.exports = {
  emitToUsers,
  initializeSocket
};
