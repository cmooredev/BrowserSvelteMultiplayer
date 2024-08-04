const {
  PLAYER_SIZE,
  BULLET_SIZE,
  BEAM_DURATION,
  BOSS_SIZE,
} = require("./constants");
const { checkPlayerPowerUpCollisions } = require("./powerups");

function checkCollisions(gameState) {
  checkBulletCollisions(gameState);
  checkBeamCollisions(gameState);
  checkBossBulletCollisions(gameState);
  checkPlayerBossCollision(gameState);
  if (checkPlayerEnemyCollisions(gameState)) {
    return true; // Game over
  }
  checkPlayerPowerUpCollisions(gameState);
  return false;
}

function checkBulletCollisions(gameState) {
  for (let bulletId in gameState.bullets) {
    let bullet = gameState.bullets[bulletId];
    for (let enemyId in gameState.enemies) {
      let enemy = gameState.enemies[enemyId];
      if (isColliding(bullet, enemy, PLAYER_SIZE, BULLET_SIZE)) {
        delete gameState.enemies[enemyId];
        delete gameState.bullets[bulletId];
        gameState.changes.enemies[enemyId] = null;
        gameState.changes.bullets[bulletId] = null;
        if (gameState.players[bullet.playerId]) {
          gameState.players[bullet.playerId].score += 100;
          gameState.changes.players[bullet.playerId] =
            gameState.players[bullet.playerId];
        }
        break;
      }
    }
  }

  if (gameState.boss) {
    for (let bulletId in gameState.bullets) {
      let bullet = gameState.bullets[bulletId];
      if (
        !bullet.isBossBullet &&
        bullet.x < gameState.boss.x + BOSS_SIZE &&
        bullet.x + BULLET_SIZE > gameState.boss.x &&
        bullet.y < gameState.boss.y + BOSS_SIZE &&
        bullet.y + BULLET_SIZE > gameState.boss.y
      ) {
        gameState.boss.health -= 10;
        delete gameState.bullets[bulletId];
        gameState.changes.bullets[bulletId] = null;
        gameState.changes.boss = { ...gameState.boss };

        if (gameState.boss.health <= 0) {
          gameState.boss = null; // Change this line
          gameState.changes.boss = null;
          // Award points to all players
          for (let playerId in gameState.players) {
            console.log("Boss killed", playerId);
            gameState.players[playerId].score += 1000;
            gameState.changes.players[playerId] = {
              ...gameState.players[playerId],
            };
          }
        }
        break;
      }
    }
  }
}

function checkBossBulletCollisions(gameState) {
  for (let bulletId in gameState.bullets) {
    let bullet = gameState.bullets[bulletId];
    if (!bullet.isBossBullet) continue;

    for (let playerId in gameState.players) {
      let player = gameState.players[playerId];
      if (player.isDead || player.shield) continue;

      if (isColliding(bullet, player, PLAYER_SIZE, BULLET_SIZE)) {
        player.isDead = true;
        gameState.changes.players[playerId] = player;
        delete gameState.bullets[bulletId];
        gameState.changes.bullets[bulletId] = null;
        break;
      }
    }
  }
}

function checkPlayerBossCollision(gameState) {
  if (!gameState.boss) return;

  for (let playerId in gameState.players) {
    const player = gameState.players[playerId];
    if (player.isDead) continue;

    if (isColliding(player, gameState.boss, BOSS_SIZE, PLAYER_SIZE)) {
      if (!player.shield) {
        player.isDead = true;
        gameState.changes.players[playerId] = player;
      }
    }
  }
}

function checkPlayerEnemyCollisions(gameState) {
  let gameOver = true;
  for (let playerId in gameState.players) {
    const player = gameState.players[playerId];
    if (player.isDead) continue;

    gameOver = false; // At least one player is alive
    for (let enemyId in gameState.enemies) {
      const enemy = gameState.enemies[enemyId];
      if (isColliding(player, enemy, PLAYER_SIZE, PLAYER_SIZE)) {
        if (!player.shield) {
          player.isDead = true;
          gameState.changes.players[playerId] = player;
        }
        delete gameState.enemies[enemyId];
        gameState.changes.enemies[enemyId] = null;
        break;
      }
    }
  }
  return gameOver;
}

function checkBeamCollisions(gameState) {
  const now = Date.now();
  for (let beamId in gameState.beams) {
    const beam = gameState.beams[beamId];
    if (now - beam.createdAt > BEAM_DURATION) {
      delete gameState.beams[beamId];
      gameState.changes.beams[beamId] = null;
      continue;
    }
    for (let playerId in gameState.players) {
      const player = gameState.players[playerId];
      if (player.isDead || player.shield) continue;
      if (
        player.x < beam.x + beam.width &&
        player.x + PLAYER_SIZE > beam.x &&
        player.y < beam.y + 5 &&
        player.y + PLAYER_SIZE > beam.y - 5
      ) {
        player.isDead = true;
        gameState.changes.players[playerId] = player;
      }
    }
  }
}

function isColliding(obj1, obj2, size1, size2) {
  return (
    obj1.x < obj2.x + size2 &&
    obj1.x + size1 > obj2.x &&
    obj1.y < obj2.y + size2 &&
    obj1.y + size1 > obj2.y
  );
}

module.exports = {
  checkCollisions,
};
