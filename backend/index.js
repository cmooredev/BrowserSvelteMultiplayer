const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { startGameLoop } = require("./game/gameLoop");
const {
  addPlayer,
  removePlayer,
  handlePlayerInput,
} = require("./game/gameState");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  addPlayer(socket.id);

  socket.on("disconnect", () => removePlayer(socket.id));
  socket.on("playerInput", (input) => handlePlayerInput(socket.id, input));
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`server listening on ${PORT}`);
  //start game loop
  startGameLoop(io);
});
