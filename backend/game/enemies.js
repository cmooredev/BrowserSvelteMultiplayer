const {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_SIZE,
  PLAYER_SPEED,
  ENEMY_BEAM_INTERVAL,
  BOSS_SIZE,
  BOSS_HEALTH,
} = require("./constants");

function addEnemy(gameState, id) {
  gameState.enemies[id] = {
    x: GAME_WIDTH - PLAYER_SIZE,
    y: Math.random() * (GAME_HEIGHT - PLAYER_SIZE),
    dx: -PLAYER_SPEED / 2 + (Math.random() - 0.5),
    dy: (Math.random() - 0.5) * PLAYER_SPEED,
  };
  gameState.changes.enemies[id] = gameState.enemies[id];
}

function spawnEnemyWave(gameState) {
  gameState.waveNumber++;
  const enemyCount = gameState.waveNumber * 2;
  for (let i = 0; i < enemyCount; i++) {
    addEnemy(gameState, `enemy_${Date.now()}_${i}`);
  }
}

function updateEnemyPositions(gameState) {
  for (let enemyId in gameState.enemies) {
    let enemy = gameState.enemies[enemyId];
    enemy.x += enemy.dx;
    enemy.y += enemy.dy;

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

function checkAndFireEnemyBeam(gameState) {
  const now = Date.now();
  if (now - gameState.lastEnemyBeamTime > ENEMY_BEAM_INTERVAL) {
    gameState.lastEnemyBeamTime = now;
    const enemies = Object.values(gameState.enemies);
    if (enemies.length > 0) {
      const randomEnemy = enemies[Math.floor(Math.random() * enemies.length)];
      fireEnemyBeam(gameState, randomEnemy);
    }
  }
}

function fireEnemyBeam(gameState, enemy) {
  if (!gameState.beams) gameState.beams = {};
  if (!gameState.changes.beams) gameState.changes.beams = {};

  const beamId = `beam_${Date.now()}`;
  const isLeftSide = enemy.x < GAME_WIDTH / 2;
  const beamWidth = isLeftSide ? GAME_WIDTH - enemy.x : enemy.x;

  gameState.beams[beamId] = {
    x: isLeftSide ? enemy.x : 0,
    y: enemy.y + PLAYER_SIZE / 2 - 10,
    width: beamWidth,
    height: 20,
    direction: isLeftSide ? "right" : "left",
    createdAt: Date.now(),
  };
  gameState.changes.beams[beamId] = gameState.beams[beamId];
}

function spawnBoss(gameState) {
  const bossId = `boss_${Date.now()}`;
  gameState.boss = {
    id: bossId,
    x: GAME_WIDTH - BOSS_SIZE,
    y: (GAME_HEIGHT - BOSS_SIZE) / 2,
    health: BOSS_HEALTH,
    lastShootTime: Date.now() + 2000,
  };
  gameState.changes.boss = gameState.boss;
}

function updateBossPosition(gameState) {
  if (!gameState.boss) return;

  gameState.boss.y += Math.sin(Date.now() / 1000) * 2;
  gameState.boss.y = Math.max(
    0,
    Math.min(GAME_HEIGHT - BOSS_SIZE, gameState.boss.y)
  );

  gameState.changes.boss = gameState.boss;
}

function fireBossWave(gameState) {
  if (!gameState.boss || Date.now() - gameState.boss.lastShootTime < 2000)
    return;

  gameState.boss.lastShootTime = Date.now();
  const bulletCount = 10;
  for (let i = 0; i < bulletCount; i++) {
    const bulletId = `bossBullet_${Date.now()}_${i}`;
    gameState.bullets[bulletId] = {
      x: gameState.boss.x,
      y: gameState.boss.y + (BOSS_SIZE / bulletCount) * i,
      dx: -5,
      dy: 0,
      isBossBullet: true,
    };
    gameState.changes.bullets[bulletId] = gameState.bullets[bulletId];
  }
}

module.exports = {
  addEnemy,
  spawnEnemyWave,
  updateEnemyPositions,
  checkAndFireEnemyBeam,
  spawnBoss,
  updateBossPosition,
  fireBossWave,
};
