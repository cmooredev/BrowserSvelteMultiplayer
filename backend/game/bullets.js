const {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_SIZE,
  BULLET_SIZE,
  BULLET_SPEED,
} = require("./constants");

function addBullet(gameState, playerId) {
  const player = gameState.players[playerId];
  const bulletId = Date.now().toString();
  const directionOffsets = {
    left: [-PLAYER_SIZE / 2, 0, -BULLET_SPEED, 0],
    right: [PLAYER_SIZE / 2, 0, BULLET_SPEED, 0],
    up: [0, -PLAYER_SIZE / 2, 0, -BULLET_SPEED],
    down: [0, PLAYER_SIZE / 2, 0, BULLET_SPEED],
  };

  const [xOffset, yOffset, dx, dy] = directionOffsets[player.direction];
  const bullet = {
    x: player.x + PLAYER_SIZE / 2 + xOffset,
    y: player.y + PLAYER_SIZE / 2 + yOffset,
    dx,
    dy,
    playerId,
  };

  gameState.bullets[bulletId] = bullet;
  gameState.changes.bullets[bulletId] = bullet;
}

function createRadialBlast(gameState, player) {
  const bulletCount = 16;
  for (let i = 0; i < bulletCount; i++) {
    const angle = (i / bulletCount) * 2 * Math.PI;
    const bulletId = `radial_${Date.now()}_${i}`;
    gameState.bullets[bulletId] = {
      x: player.x + PLAYER_SIZE / 2,
      y: player.y + PLAYER_SIZE / 2,
      dx: Math.cos(angle) * BULLET_SPEED,
      dy: Math.sin(angle) * BULLET_SPEED,
      playerId: player.id,
    };
    gameState.changes.bullets[bulletId] = gameState.bullets[bulletId];
  }
}

function updateBulletPositions(gameState) {
  for (let bulletId in gameState.bullets) {
    let bullet = gameState.bullets[bulletId];
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    if (
      bullet.x + BULLET_SIZE < 0 ||
      bullet.x > GAME_WIDTH ||
      bullet.y + BULLET_SIZE < 0 ||
      bullet.y > GAME_HEIGHT
    ) {
      delete gameState.bullets[bulletId];
      gameState.changes.bullets[bulletId] = null;
    } else {
      gameState.changes.bullets[bulletId] = bullet;
    }
  }
}

module.exports = {
  addBullet,
  createRadialBlast,
  updateBulletPositions,
};
