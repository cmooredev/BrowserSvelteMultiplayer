const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { findOrCreateSession, clearSessions } = require("./game/sessionManager");

function createServer() {
  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  clearSessions();

  io.on("connection", (socket) => {
    findOrCreateSession(socket, io);

    socket.on("ping", (callback) => {
      if (typeof callback === "function") {
        callback();
      }
    });
  });

  return server;
}

if (require.main === module) {
  const PORT = 3000;
  const HOST = "0.0.0.0";
  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`server listening on ${HOST}:${PORT}`);
  });
}

module.exports = { createServer };
