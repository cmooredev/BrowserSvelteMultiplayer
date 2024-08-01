const { GAME_WIDTH, GAME_HEIGHT, MAX_POWERUPS } = require("./constants");
const { addPlayer, updatePlayerPositions } = require("./players");
const { handleEnemies } = require("./enemies");
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
}

function updateGameState(gameState) {
  if (!gameState.isGameStarted || gameState.isGameOver) return;
  updatePlayerPositions(gameState);
  updateBulletPositions(gameState);
  handleEnemies(gameState);
  checkCollisions(gameState);
  updatePowerUps(gameState);
  if (Object.keys(gameState.powerups).length < MAX_POWERUPS) {
    checkAndSpawnPowerUp(gameState);
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
