const { updateGameState, getChanges } = require("./gameState");

function startGameLoop(io, roomId, gameState) {
  const targetFPS = 60;
  const frameTime = 1000 / targetFPS;
  let lastTime = Date.now();

  const intervalId = setInterval(() => {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastTime;

    updateGameState(gameState, deltaTime / 1000);
    const changes = getChanges(gameState);

    if (gameState.isGameOver) {
      io.to(roomId).emit("gameOver");
    } else {
      io.to(roomId).emit("gameStateUpdate", changes);
    }

    lastTime = currentTime;
  }, frameTime);

  return () => {
    console.log("Game loop stopped", roomId);
    clearInterval(intervalId);
  };
}

module.exports = { startGameLoop };
