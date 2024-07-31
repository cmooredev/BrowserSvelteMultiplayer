const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { findOrCreateSession, clearSessions } = require("./game/sessionManager");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

//make sure all old sessions are cleared after reset
clearSessions();

io.on("connection", (socket) => {
  findOrCreateSession(socket, io);

  // Update the ping event listener
  socket.on("ping", () => {
    socket.emit("pong");
  });
});

const PORT = 3000;
const HOST = "0.0.0.0";
server.listen(PORT, HOST, () => {
  console.log(`server listening on ${HOST}:${PORT}`);
  //start game loop
});
