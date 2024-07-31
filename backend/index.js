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
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`server listening on ${PORT}`);
  //start game loop
});
