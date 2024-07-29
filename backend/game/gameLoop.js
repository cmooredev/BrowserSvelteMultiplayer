const { updateGameState, getChanges } = require("./gameState");

function startGameLoop(io) {
  setInterval(() => {
    //update game state
    updateGameState();
    //get changes
    const changes = getChanges();
    //emit changes
    io.emit("gameStateUpdate", changes);
  }, 1000 / 60);
}

module.exports = { startGameLoop };
