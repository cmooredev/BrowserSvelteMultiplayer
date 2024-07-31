const { startGameLoop } = require("./gameLoop");
const {
  createGameState,
  addPlayer,
  removePlayer,
  handlePlayerInput,
} = require("./gameState");

const sessions = {};

function findOrCreateSession(socket, io) {
  let sessionId = Object.keys(sessions).find(
    (id) => Object.keys(sessions[id].players).length === 1
  );

  if (!sessionId) {
    sessionId = Date.now().toString();
    sessions[sessionId] = {
      players: {},
      io: io.of(`/${sessionId}`),
      gameState: createGameState(),
    };
    startGameLoop(io, sessionId, sessions[sessionId].gameState);
  }

  const session = sessions[sessionId];
  session.players[socket.id] = socket;
  addPlayer(session.gameState, socket.id);

  socket.emit("sessionId", sessionId);
  socket.join(sessionId);

  setUpSocketListeners(socket, sessionId);
}

function setUpSocketListeners(socket, sessionId) {
  socket.on("disconnect", () => {
    handleDisconnect(socket.id, sessionId);
  });
  socket.on("playerInput", (input) => {
    handlePlayerInput(sessions[sessionId].gameState, socket.id, input);
  });
}

function handleDisconnect(socketId, sessionId) {
  const session = sessions[sessionId];
  removePlayer(session.gameState, socketId);
  delete session.players[socketId];
  if (Object.keys(session.players).length === 0) {
    delete sessions[sessionId];
  }
}

function clearSessions() {
  Object.keys(sessions).forEach((key) => delete sessions[key]);
}

module.exports = { findOrCreateSession, clearSessions };
