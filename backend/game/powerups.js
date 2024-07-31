const {
  GAME_WIDTH,
  GAME_HEIGHT,
  POWERUP_SIZE,
  POWERUP_DURATION,
  POWERUP_SPAWN_INTERVAL,
  PLAYER_SIZE,
} = require("./constants");

const PowerUpType = {
  RADIAL_BLAST: "radialBlast",
  SHIELD: "shield",
};

function createPowerUp(gameState) {
  const id = `powerup_${Date.now()}`;
  const type =
    Math.random() < 0.5 ? PowerUpType.RADIAL_BLAST : PowerUpType.SHIELD;

  const powerup = {
    id,
    type,
    x: Math.random() * (GAME_WIDTH - POWERUP_SIZE),
    y: Math.random() * (GAME_HEIGHT - POWERUP_SIZE),
  };

  gameState.powerups[id] = powerup;
  gameState.changes.powerups[id] = powerup;
}

function applyPowerUp(gameState, playerId, powerupId) {
  const powerup = gameState.powerups[powerupId];
  const player = gameState.players[playerId];

  if (powerup.type === PowerUpType.RADIAL_BLAST) {
    player.radialBlast = true;
    player.radialBlastEndTime = Date.now() + 5000; // 5 seconds
  } else if (powerup.type === PowerUpType.SHIELD) {
    player.shield = true;
    player.shieldEndTime = Date.now() + POWERUP_DURATION;
  }

  delete gameState.powerups[powerupId];
  gameState.changes.powerups[powerupId] = null;
}

function updatePowerUps(gameState) {
  for (let playerId in gameState.players) {
    const player = gameState.players[playerId];
    if (player.shield && Date.now() > player.shieldEndTime) {
      player.shield = false;
      gameState.changes.players[playerId] = player;
    }
    if (player.radialBlast && Date.now() > player.radialBlastEndTime) {
      player.radialBlast = false;
      gameState.changes.players[playerId] = player;
    }
  }
}

function checkAndSpawnPowerUp(gameState) {
  const now = Date.now();
  if (now - gameState.lastPowerUpSpawnTime > POWERUP_SPAWN_INTERVAL) {
    gameState.lastPowerUpSpawnTime = now;
    createPowerUp(gameState);
  }
}

function checkPlayerPowerUpCollisions(gameState) {
  for (let playerId in gameState.players) {
    const player = gameState.players[playerId];
    for (let powerupId in gameState.powerups) {
      const powerup = gameState.powerups[powerupId];
      if (isColliding(player, powerup, PLAYER_SIZE, POWERUP_SIZE)) {
        applyPowerUp(gameState, playerId, powerupId);
        delete gameState.powerups[powerupId];
        gameState.changes.powerups[powerupId] = null;
        break;
      }
    }
  }
}

function isColliding(obj1, obj2, size1, size2 = size1) {
  return (
    obj1.x < obj2.x + size2 &&
    obj1.x + size1 > obj2.x &&
    obj1.y < obj2.y + size2 &&
    obj1.y + size1 > obj2.y
  );
}

module.exports = {
  PowerUpType,
  createPowerUp,
  applyPowerUp,
  updatePowerUps,
  checkAndSpawnPowerUp,
  checkPlayerPowerUpCollisions,
};
