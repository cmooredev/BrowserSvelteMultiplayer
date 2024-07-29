const GAME_WIDTH = 400;
const GAME_HEIGHT = 400;
const PLAYER_SIZE = 20;
const PLAYER_SPEED = 3;
const BULLET_SIZE = 5;
const BULLET_SPEED = 5;

let gameState = { players: {}, bullets: {} };
let changes = { players: {}, bullets: {} };

//add players to gamestate
function addPlayer(id) {
  gameState.players[id] = { x: 0, y: 0, dx: 0, dy: 0, direction: "right" };
  changes.players[id] = gameState.players[id];
}

function addBullet(playerId) {
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
  changes.bullets[bulletId] = bullet;
}

function removePlayer(id) {
  delete gameState.players[id];
  changes.players[id] = null;
}

function handlePlayerInput(id, input) {
  console.log("handling user input", input);
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

  if (input === "shoot") addBullet(id);
  else if (directions[input]) {
    [player.dx, player.dy, player.direction] = directions[input];
    changes.players[id] = player;
  }
}

function updateGameState() {
  //update player positions
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
    changes.players[playerId] = player;
  }

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
      changes.bullets[bulletId] = null;
    } else {
      changes.bullets[bulletId] = bullet;
    }
  }
}

function getChanges() {
  const currentChanges = { ...changes };
  changes = { players: {}, bullets: {} };
  return currentChanges;
}

module.exports = {
  addPlayer,
  removePlayer,
  handlePlayerInput,
  updateGameState,
  getChanges,
};
