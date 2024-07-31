const GAME_WIDTH = 1000;
const GAME_HEIGHT = 500;
const PLAYER_SIZE = 20;
const PLAYER_SPEED = 3;
const BULLET_SIZE = 5;
const BULLET_SPEED = 5;

function createGameState() {
  return {
    players: {},
    bullets: {},
    enemies: {},
    changes: { players: {}, bullets: {}, enemies: {} },
    waveNumber: 0,
  };
}

//add players to gamestate
function addPlayer(gameState, id) {
  gameState.players[id] = {
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    direction: "right",
    score: 0, //score for new players is set to 0
  };
  gameState.changes.players[id] = gameState.players[id];
}

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

function removePlayer(gameState, id) {
  delete gameState.players[id];
  gameState.changes.players[id] = null;
}

//add enemy
function addEnemy(gameState, id) {
  gameState.enemies[id] = {
    x: GAME_WIDTH - PLAYER_SIZE, //start at the right side of the screen
    y: Math.random() * (GAME_HEIGHT - PLAYER_SIZE),
    dx: -PLAYER_SPEED / 2 + (Math.random() - 0.5),
    dy: (Math.random() - 0.5) * PLAYER_SPEED,
  };
  gameState.changes.enemies[id] = gameState.enemies[id];
}

//create new wave
function spawnEnemyWave(gameState) {
  gameState.waveNumber++;
  const enemyCount = gameState.waveNumber * 2;
  for (let i = 0; i < enemyCount; i++) {
    addEnemy(gameState, `enemy_${Date.now()}_${i}`);
  }
}

//check wave
function checkAndSpawnNewWave(gameState) {
  if (Object.keys(gameState.enemies).length === 0) {
    spawnEnemyWave(gameState);
  }
}

function handlePlayerInput(gameState, id, input) {
  const player = gameState.players[id];
  if (!player) return;

  const directions = {
    left: [-PLAYER_SPEED, 0, "left"],
    right: [PLAYER_SPEED, 0, "right"],
    up: [0, -PLAYER_SPEED, "up"],
    down: [0, PLAYER_SPEED, "down"],
    stopX: [0, player.dy, player.direction],
    stopY: [player.dx, 0, player.direction],
  };

  if (input === "shoot") addBullet(gameState, id);
  else if (directions[input]) {
    [player.dx, player.dy, player.direction] = directions[input];
    gameState.changes.players[id] = player;
  }
}

function updatePlayerPositions(gameState) {
  for (let playerId in gameState.players) {
    let player = gameState.players[playerId];
    //check boundaries on x-axis
    player.x = Math.max(
      0,
      Math.min(GAME_WIDTH - PLAYER_SIZE, player.x + player.dx)
    );
    //check boundaries on y-axis
    player.y = Math.max(
      0,
      Math.min(GAME_HEIGHT - PLAYER_SIZE, player.y + player.dy)
    );
    gameState.changes.players[playerId] = player;
  }
}

function updateEnemyPositions(gameState) {
  for (let enemyId in gameState.enemies) {
    let enemy = gameState.enemies[enemyId];
    enemy.x += enemy.dx;
    enemy.y += enemy.dy;

    //keep within game
    if (enemy.y <= 0 || enemy.y + PLAYER_SIZE >= GAME_HEIGHT) {
      enemy.dy = -enemy.dy;
    }
    enemy.y = Math.max(0, Math.min(GAME_HEIGHT - PLAYER_SIZE, enemy.y));

    if (enemy.x < 0 || enemy.x + PLAYER_SIZE > GAME_WIDTH) {
      enemy.dx = -enemy.dx;
    }
    enemy.x = Math.max(0, Math.min(GAME_WIDTH - PLAYER_SIZE, enemy.x));

    gameState.changes.enemies[enemyId] = enemy;
  }
}

function updateBulletPositions(gameState) {
  for (let bulletId in gameState.bullets) {
    let bullet = gameState.bullets[bulletId];
    bullet.x += bullet.dx;
    bullet.y += bullet.dy;
    //check boundaries
    if (
      bullet.x + BULLET_SIZE < 0 ||
      bullet.x > GAME_WIDTH ||
      bullet.y + BULLET_SIZE < 0 ||
      bullet.y > GAME_HEIGHT
    ) {
      //if bullet is out of bounds, delete bullet
      delete gameState.bullets[bulletId];
      gameState.changes.bullets[bulletId] = null;
    } else {
      gameState.changes.bullets[bulletId] = bullet;
    }
  }
}

function checkBulletCollisions(gameState) {
  for (let bulletId in gameState.bullets) {
    let bullet = gameState.bullets[bulletId];
    for (let enemyId in gameState.enemies) {
      let enemy = gameState.enemies[enemyId];
      if (
        bullet.x < enemy.x + PLAYER_SIZE &&
        bullet.x + BULLET_SIZE > enemy.x &&
        bullet.y < enemy.y + PLAYER_SIZE &&
        bullet.y + BULLET_SIZE > enemy.y
      ) {
        delete gameState.enemies[enemyId];
        delete gameState.bullets[bulletId];
        gameState.changes.enemies[enemyId] = null;
        gameState.changes.bullets[bulletId] = null;
        //increment score for player
        gameState.players[bullet.playerId].score += 100;
        gameState.changes.players[bullet.playerId] =
          gameState.players[bullet.playerId];
        break;
      }
    }
  }
}

function updateGameState(gameState) {
  //update player positions
  updatePlayerPositions(gameState);
  //update bullet positions
  updateBulletPositions(gameState);
  //update enemy positions
  updateEnemyPositions(gameState);
  checkBulletCollisions(gameState);
  //check and spawn wave
  checkAndSpawnNewWave(gameState);
}

function getChanges(gameState) {
  const currentChanges = {
    ...gameState.changes,
    waveNumber: gameState.waveNumber,
  };
  gameState.changes = { players: {}, bullets: {}, enemies: {} };
  return currentChanges;
}

module.exports = {
  createGameState,
  addPlayer,
  removePlayer,
  handlePlayerInput,
  updateGameState,
  getChanges,
};
