const { updateGameState, getChanges } = require("./gameState");

function startGameLoop(io, roomId, gameState) {
  const intervalId = setInterval(() => {
    updateGameState(gameState);
    const changes = getChanges(gameState);
    io.to(roomId).emit("gameStateUpdate", changes);
  }, 1000 / 60);

  return () => clearInterval(intervalId);
}

module.exports = { startGameLoop };
