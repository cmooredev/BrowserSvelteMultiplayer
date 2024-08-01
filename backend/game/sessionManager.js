const { startGameLoop } = require("./gameLoop");
const { createGameState, startGame, resetGame } = require("./gameState");
const { addPlayer, removePlayer, handlePlayerInput } = require("./players");
const { v4: uuidv4 } = require("uuid");

const sessions = {};

function findOrCreateSession(socket, io) {
  let sessionId = Object.keys(sessions).find(
    (id) =>
      !sessions[id].gameState.isGameStarted &&
      Object.keys(sessions[id].players).length < 2
  );

  if (!sessionId) {
    sessionId = uuidv4();
    console.log("Creating session:", sessionId);
    sessions[sessionId] = {
      players: {},
      io: io.of(`/${sessionId}`),
      gameState: createGameState(),
      gameLoopStop: null,
      host: socket.id,
    };
  }

  const session = sessions[sessionId];
  session.players[socket.id] = socket;
  addPlayer(session.gameState, socket.id);

  if (!session.gameLoopStop) {
    session.gameLoopStop = startGameLoop(io, sessionId, session.gameState);
  }

  const isHost = session.host === socket.id;
  socket.emit("sessionId", { sessionId, isHost });
  console.log("Joining session:", sessionId);
  socket.join(sessionId);

  setUpSocketListeners(io, socket, sessionId);
  return sessionId;
}

function setUpSocketListeners(io, socket, sessionId) {
  socket.on("disconnect", () => {
    handleDisconnect(socket.id, sessionId);
  });
  socket.on("playerInput", (input) => {
    handlePlayerInput(sessions[sessionId].gameState, socket.id, input);
  });
  socket.on("startGame", () => {
    const session = sessions[sessionId];
    if (session) {
      if (session.gameState.isGameOver) {
        resetGame(session.gameState);
        for (const playerId in session.players) {
          addPlayer(session.gameState, playerId);
        }
      }
      startGame(session.gameState);
      io.to(sessionId).emit("gameStarted");
    } else {
      console.log("Session not found:", sessionId);
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
  } else if (session.host === socketId) {
    // If the host disconnected, assign a new host
    session.host = Object.keys(session.players)[0];
    session.gameState.host = session.host;
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
