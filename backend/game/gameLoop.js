const { updateGameState, getChanges } = require("./gameState");

function startGameLoop(io, roomId, gameState) {
  setInterval(() => {
    //update game state
    updateGameState(gameState);
    //get changes
    const changes = getChanges(gameState);
    //emit changes
    io.to(roomId).emit("gameStateUpdate", changes);
  }, 1000 / 60);
}

module.exports = { startGameLoop };
