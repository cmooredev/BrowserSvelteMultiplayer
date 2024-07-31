const { startGameLoop } = require("./gameLoop");
const {
  createGameState,
  addPlayer,
  removePlayer,
  handlePlayerInput,
  startGame,
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
      gameLoopStop: null,
    };
  }

  const session = sessions[sessionId];
  session.players[socket.id] = socket;
  addPlayer(session.gameState, socket.id);

  if (!session.gameLoopStop) {
    session.gameLoopStop = startGameLoop(io, sessionId, session.gameState);
  }

  socket.emit("sessionId", sessionId);
  socket.join(sessionId);

  setUpSocketListeners(socket, sessionId);
  return sessionId;
}

function setUpSocketListeners(socket, sessionId) {
  socket.on("disconnect", () => {
    handleDisconnect(socket.id, sessionId);
  });
  socket.on("playerInput", (input) => {
    handlePlayerInput(sessions[sessionId].gameState, socket.id, input);
  });
  socket.on("startGame", () => {
    const session = sessions[sessionId];
    if (session && !session.gameState.isGameStarted) {
      startGame(session.gameState);
      session.io.to(sessionId).emit("gameStarted");
    }
  });
}

function handleDisconnect(socketId, sessionId) {
  const session = sessions[sessionId];
  if (!session) return;

  removePlayer(session.gameState, socketId);
  delete session.players[socketId];

  if (Object.keys(session.players).length === 0) {
    if (session.gameLoopStop) {
      session.gameLoopStop();
    }
    delete sessions[sessionId];
  }
}

function clearSessions() {
  Object.keys(sessions).forEach((key) => {
    if (sessions[key].gameLoopStop) {
      sessions[key].gameLoopStop();
    }
    delete sessions[key];
  });
}

function getSession(sessionId) {
  return sessions[sessionId];
}

module.exports = { findOrCreateSession, clearSessions, getSession };
