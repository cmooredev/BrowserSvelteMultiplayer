const { startGameLoop } = require("./gameLoop");
const { createGameState, startGame, resetGame } = require("./gameState");
const { addPlayer, removePlayer, handlePlayerInput } = require("./players");
const { v4: uuidv4 } = require("uuid");
const { PLAYER_SPEED, BULLET_COOLDOWN } = require("./constants");

const sessions = {};
const playerSessions = {};

const SESSION_CLEANUP_INTERVAL = 60000; // 1 minute

function findOrCreateSession(socket, io) {
  cleanupStaleSessions();

  let sessionId = Object.keys(sessions).find(
    (id) =>
      !sessions[id].gameState.isGameStarted &&
      Object.keys(sessions[id].players).length < 2
  );

  if (!sessionId) {
    sessionId = uuidv4();
    sessions[sessionId] = {
      players: {},
      io: io.of(`/${sessionId}`),
      gameState: createGameState(),
      gameLoopStop: null,
      host: socket.id,
      lastActivity: Date.now(),
    };
  }

  const session = sessions[sessionId];
  session.players[socket.id] = socket;
  playerSessions[socket.id] = sessionId;
  addPlayer(session.gameState, socket.id);

  if (!session.gameLoopStop) {
    session.gameLoopStop = startGameLoop(io, sessionId, session.gameState);
  }

  const isHost = session.host === socket.id;
  const sessionHost = session.host;
  const playerIds = Object.keys(session.players);
  socket.emit("sessionId", { sessionId, isHost, playerIds, sessionHost });
  socket.join(sessionId);

  setUpSocketListeners(io, socket, sessionId);
  session.lastActivity = Date.now();
  return sessionId;
}

function setUpSocketListeners(io, socket, sessionId) {
  socket.on("disconnect", () => {
    handleDisconnect(io, socket.id);
  });
  socket.on("playerInput", (input) => {
    const session = sessions[sessionId];
    if (!session) return;

    const currentTime = Date.now();

    handlePlayerInput(session.gameState, socket.id, input);
    session.lastActivity = currentTime;
  });
  socket.on("startGame", () => {
    const session = sessions[sessionId];
    if (session && socket.id === session.host) {
      if (session.gameState.isGameOver) {
        resetGame(session.gameState);
        for (const playerId in session.players) {
          addPlayer(session.gameState, playerId);
        }
      }
      startGame(session.gameState);
      io.to(sessionId).emit("gameStarted");
      session.lastActivity = Date.now();
    }
  });
}

function handleDisconnect(io, socketId) {
  const sessionId = playerSessions[socketId];
  if (!sessionId) return;

  const session = sessions[sessionId];
  if (!session) return;

  removePlayer(session.gameState, socketId);
  delete session.players[socketId];
  delete playerSessions[socketId];

  if (Object.keys(session.players).length === 0) {
    if (session.gameLoopStop) {
      session.gameLoopStop();
    }
    delete sessions[sessionId];
  } else if (session.host === socketId) {
    console.log("Player was host. Finding new host...");
    session.host = Object.keys(session.players)[0];
    session.gameState.host = session.host;
    io.to(sessionId).emit("newHost", session.host);
    console.log("Emitting new host id", session.host);
  }

  session.lastActivity = Date.now();
}

function cleanupStaleSessions() {
  const now = Date.now();
  Object.keys(sessions).forEach((sessionId) => {
    const session = sessions[sessionId];
    if (now - session.lastActivity > SESSION_CLEANUP_INTERVAL) {
      if (session.gameLoopStop) {
        session.gameLoopStop();
      }
      Object.keys(session.players).forEach((playerId) => {
        delete playerSessions[playerId];
      });
      delete sessions[sessionId];
    }
  });
}

function clearSessions() {
  Object.keys(sessions).forEach((key) => {
    if (sessions[key].gameLoopStop) {
      sessions[key].gameLoopStop();
      console.log("Cleared session", key);
    }
    delete sessions[key];
  });
  Object.keys(playerSessions).forEach((key) => {
    delete playerSessions[key];
  });
}

function getSession(sessionId) {
  return sessions[sessionId];
}

function getAllSessions() {
  return sessions;
}

function getAllPlayerSessions() {
  return playerSessions;
}

setInterval(cleanupStaleSessions, SESSION_CLEANUP_INTERVAL);

module.exports = {
  findOrCreateSession,
  clearSessions,
  getSession,
  getAllSessions,
  getAllPlayerSessions,
};
