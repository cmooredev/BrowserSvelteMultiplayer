const { GAME_WIDTH, GAME_HEIGHT } = require("./constants");
const { addPlayer, updatePlayerPositions } = require("./players");
const {
  updateEnemyPositions,
  spawnEnemyWave,
  checkAndFireEnemyBeam,
  spawnBoss,
  updateBossPosition,
  fireBossWave,
} = require("./enemies");
const { updateBulletPositions } = require("./bullets");
const { checkAndSpawnPowerUp, updatePowerUps } = require("./powerups");
const { checkCollisions } = require("./collisions");

function createGameState() {
  return {
    players: {},
    bullets: {},
    enemies: {},
    beams: {},
    changes: { players: {}, bullets: {}, enemies: {}, powerups: {}, beams: {} },
    waveNumber: 0,
    isGameStarted: false,
    powerups: {},
    lastEnemyBeamTime: 0,
    lastPowerUpSpawnTime: 0,
    host: null,
    boss: null,
  };
}

function resetGame(gameState) {
  gameState.players = {};
  gameState.bullets = {};
  gameState.enemies = {};
  gameState.powerups = {};
  gameState.changes = {
    players: {},
    bullets: {},
    enemies: {},
    powerups: {},
    beams: {},
  };
  gameState.waveNumber = 0;
  gameState.isGameStarted = false;
  gameState.isGameOver = false;
  gameState.lastEnemyBeamTime = 0;
  gameState.lastPowerUpSpawnTime = 0;
  gameState.boss = null;
}

function startGame(gameState) {
  gameState.isGameStarted = true;
  gameState.waveNumber = 0;
  spawnEnemyWave(gameState);
}

function updateGameState(gameState) {
  if (!gameState.isGameStarted || gameState.isGameOver) return;
  updatePlayerPositions(gameState);
  updateBulletPositions(gameState);
  updateEnemyPositions(gameState);
  checkCollisions(gameState);
  updatePowerUps(gameState);
  checkAndFireEnemyBeam(gameState);
  checkAndSpawnPowerUp(gameState);
  checkAndSpawnNewWave(gameState);
  if (gameState.boss) {
    updateBossPosition(gameState);
    fireBossWave(gameState);
  }
}

function checkAndSpawnNewWave(gameState) {
  if (Object.keys(gameState.enemies).length === 0 && !gameState.boss) {
    gameState.waveNumber++;
    if (gameState.waveNumber % 3 === 0) {
      spawnBoss(gameState);
    } else {
      spawnEnemyWave(gameState);
    }
    reviveDeadPlayers(gameState);
  }
}

function reviveDeadPlayers(gameState) {
  for (let playerId in gameState.changes.players) {
    if (gameState.changes.players[playerId] === null) {
      addPlayer(gameState, playerId);
    }
  }
}

function getChanges(gameState) {
  const currentChanges = {
    ...gameState.changes,
    waveNumber: gameState.waveNumber,
    players: gameState.players,
  };
  gameState.changes = {
    players: {},
    bullets: {},
    enemies: {},
    powerups: {},
    beams: {},
  };
  return currentChanges;
}

module.exports = {
  createGameState,
  resetGame,
  startGame,
  updateGameState,
  getChanges,
  GAME_WIDTH,
  GAME_HEIGHT,
};
