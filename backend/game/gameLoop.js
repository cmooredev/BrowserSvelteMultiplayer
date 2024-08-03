const { updateGameState, getChanges } = require("./gameState");

function startGameLoop(io, roomId, gameState) {
  const targetFPS = 60;
  const frameTime = 1000 / targetFPS;
  const maxUpdatesPerFrame = 3; // Limit updates per frame
  let lastTime = Date.now();
  let accumulatedTime = 0;

  const loop = () => {
    const currentTime = Date.now();
    const deltaTime = Math.min(currentTime - lastTime, 100); // Cap at 100ms
    accumulatedTime += deltaTime;

    let updatesPerformed = 0;
    while (
      accumulatedTime >= frameTime &&
      updatesPerformed < maxUpdatesPerFrame
    ) {
      updateGameState(gameState, frameTime / 1000);
      accumulatedTime -= frameTime;
      updatesPerformed++;
    }

    if (updatesPerformed > 0) {
      const changes = getChanges(gameState);
      if (
        Object.keys(changes).some((key) => Object.keys(changes[key]).length > 0)
      ) {
        if (gameState.isGameOver) {
          io.to(roomId).emit("gameOver");
        } else {
          io.to(roomId).emit("gameStateUpdate", changes);
        }
      }
    }

    lastTime = currentTime;
    setImmediate(loop);
  };

  loop();

  return () => {
    // Cleanup function
  };
}

module.exports = { startGameLoop };
