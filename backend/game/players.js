const {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_SIZE,
  PLAYER_SPEED,
} = require("./constants");
const { addBullet, createRadialBlast } = require("./bullets");

function addPlayer(gameState, id, isHost = false) {
  gameState.players[id] = {
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    direction: "right",
    isDead: false,
    score: 0,
    shield: false,
    shieldEndTime: 0,
    radialBlast: false,
    radialBlastEndTime: 0,
    isHost: isHost,
  };
  gameState.changes.players[id] = gameState.players[id];
  if (isHost) {
    gameState.host = id;
  }
}

function removePlayer(gameState, id) {
  delete gameState.players[id];
  gameState.changes.players[id] = null;
}

function handlePlayerInput(gameState, id, input) {
  const player = gameState.players[id];
  if (!player || player.isDead) return;

  const directions = {
    left: [-PLAYER_SPEED, 0, "left"],
    right: [PLAYER_SPEED, 0, "right"],
    up: [0, -PLAYER_SPEED, "up"],
    down: [0, PLAYER_SPEED, "down"],
    stopX: [0, player.dy, player.direction],
    stopY: [player.dx, 0, player.direction],
  };

  if (input === "shoot") {
    if (player.radialBlast) {
      createRadialBlast(gameState, player);
    } else {
      addBullet(gameState, id);
    }
  } else if (directions[input]) {
    [player.dx, player.dy, player.direction] = directions[input];
    gameState.changes.players[id] = player;
  }
}

function updatePlayerPositions(gameState) {
  let allPlayersDead = true;
  for (let playerId in gameState.players) {
    let player = gameState.players[playerId];
    if (player.isDead) {
      gameState.changes.players[playerId] = null;
      continue;
    }
    allPlayersDead = false;
    player.x = Math.max(
      0,
      Math.min(GAME_WIDTH - PLAYER_SIZE, player.x + player.dx)
    );
    player.y = Math.max(
      0,
      Math.min(GAME_HEIGHT - PLAYER_SIZE, player.y + player.dy)
    );
    gameState.changes.players[playerId] = player;
  }
  gameState.isGameOver = allPlayersDead;
}

module.exports = {
  addPlayer,
  removePlayer,
  handlePlayerInput,
  updatePlayerPositions,
};
