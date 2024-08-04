<script>
  import Background from "./Background.svelte";
  import { onMount, onDestroy } from "svelte";
  import io from "socket.io-client";

  const SOCKET_URL = "http://localhost:3000";
  const socket = io(SOCKET_URL);

  let players = {};
  let bullets = {};
  let enemies = {};
  let powerups = {};
  let boss = null;
  let bossMaxHealth = 1000;
  let sessionId = "";
  let socketId = "";
  let waveNumber = 0;
  let isGameStarted = false;
  let hostSocketId = "";
  let beams = {};
  let isGameOver = false;
  let ping = 0;
  let pingInterval;

  $: playerEntries = Object.entries(players);
  $: bulletEntries = Object.entries(bullets);
  $: enemyEntries = Object.entries(enemies);
  $: powerupEntries = Object.entries(powerups);
  $: beamEntries = Object.entries(beams);
  $: isHost = socketId === hostSocketId;

  function updatePing() {
    const start = Date.now();
    socket.emit("ping", () => {
      ping = Date.now() - start;
    });
  }

  function getPingColor(ping) {
    if (ping < 50) return "green";
    if (ping < 100) return "yellow";
    if (ping < 150) return "orange";
    return "red";
  }

  const updatePlayers = (changes) => {
    players = { ...changes };
    Object.keys(changes).forEach(
      (id) => changes[id] == null && delete players[id]
    );
  };

  const updateBeams = (changes) => {
    beams = { ...beams, ...changes };
    Object.keys(changes).forEach(
      (id) => changes[id] == null && delete beams[id]
    );
  };

  const updateEnemies = (changes) => {
    enemies = { ...enemies, ...changes };
    Object.keys(changes).forEach(
      (id) => changes[id] == null && delete enemies[id]
    );
  };

  const updateBullets = (changes) => {
    bullets = { ...bullets, ...changes };
    Object.keys(changes).forEach(
      (id) => changes[id] == null && delete bullets[id]
    );
  };

  const updatePowerups = (changes) => {
    powerups = { ...powerups, ...changes };
    Object.keys(changes).forEach(
      (id) => changes[id] == null && delete powerups[id]
    );
  };

  const emitPlayerInput = (direction) => socket.emit("playerInput", direction);

  const keyActions = {
    ArrowLeft: () => emitPlayerInput("left"),
    ArrowRight: () => emitPlayerInput("right"),
    ArrowUp: () => emitPlayerInput("up"),
    ArrowDown: () => emitPlayerInput("down"),
    " ": () => emitPlayerInput("shoot"),
  };

  const handleKeyDown = (e) => keyActions[e.key]?.();

  const handleKeyUp = (e) => {
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) emitPlayerInput("stopX");
    if (["ArrowUp", "ArrowDown"].includes(e.key)) emitPlayerInput("stopY");
  };

  const clearGameState = () => {
    players = {};
    bullets = {};
    enemies = {};
    powerups = {};
    beams = {};
    waveNumber = 0;
  };

  const startOrRestartGame = () => {
    clearGameState();
    socket.emit("startGame");
    isGameStarted = true;
    isGameOver = false;
  };

  onMount(() => {
    socket.on(
      "sessionId",
      ({ sessionId: id, isHost: host, playerIds: players, sessionHost }) => {
        clearGameState();
        sessionId = id;
        socketId = socket.id;
        hostSocketId = host ? socket.id : "";
        console.log(
          `Connected to session ${sessionId} as socket ${socketId}. Is host: ${isHost}. session.host: ${sessionHost}`
        );
        clearGameState();
        isGameStarted = false;

        socket.on("newHost", (host) => {
          console.log("Host left. You are now the host.");
          hostSocketId = host;
        });

        socket.on("gameStateUpdate", (changes) => {
          updatePlayers(changes.players);
          updateBeams(changes.beams);
          updateBullets(changes.bullets);
          updateEnemies(changes.enemies);
          updatePowerups(changes.powerups);
          waveNumber = changes.waveNumber;
          if (changes.boss) {
            boss = changes.boss;
            if (boss && !bossMaxHealth) {
              bossMaxHealth = boss.health; // Set max health when boss first appears
            }
          } else {
            boss = null;
            bossMaxHealth = 1000; // Reset max health when boss is defeated
          }
          if (Object.keys(players).length === 0 && isGameStarted) {
            isGameOver = true;
            isGameStarted = false;
          }
        });

        socket.on("gameStarted", () => {
          clearGameState();
          isGameStarted = true;
          isGameOver = false;
        });

        socket.on("gameOver", () => {
          isGameOver = true;
          isGameStarted = false;
        });

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
      }
    );

    pingInterval = setInterval(updatePing, 1000); // Update ping every 5 seconds

    return () => {
      if (socket) {
        socket.off("gameStateUpdate");
        socket.off("gameStarted");
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      }
    };
  });

  onDestroy(() => {
    if (pingInterval) {
      clearInterval(pingInterval);
    }
  });
</script>

<main>
  <h1>Game</h1>
  <div>Session ID: {sessionId.slice(-4)}</div>
  <div>Wave Number: {waveNumber}</div>
  <div class="ping-meter" style="color: {getPingColor(ping)}">
    Ping: {ping}ms
  </div>

  <div class="scores">
    {#each playerEntries as [id, { score }], index}
      <div class="player-score {id == socketId ? 'highlight' : ''}">
        Player {index + 1}: {score} : {id.slice(-4)}
      </div>
    {/each}
  </div>
  <div class="game-container">
    <div class="game-area">
      <Background />

      {#each playerEntries as [id, { x, y, direction, shield, isDead }]}
        <div
          class="player {direction} {shield ? 'shielded' : ''} {isDead
            ? 'dead'
            : ''}"
          style="left: {x}px; top: {y}px;"
        />
      {/each}
      {#each bulletEntries as [id, { x, y, isEnemyBeam }]}
        <div
          class="bullet {isEnemyBeam ? 'enemy-beam' : ''}"
          style="left: {x}px; top: {y}px;"
        />
      {/each}
      {#each enemyEntries as [id, { x, y }]}
        <div class="enemy" style="left: {x}px; top: {y}px;" />
      {/each}
      {#each powerupEntries as [id, powerup]}
        <div
          class="powerup {powerup.type}"
          style="left: {powerup.x}px; top: {powerup.y}px;"
        />
      {/each}
      {#each beamEntries as [id, beam]}
        <div class="beam-container" style="left: {beam.x}px; top: {beam.y}px;">
          <div
            class="enemy-beam"
            style="width: {beam.width}px; height: {beam.height}px;"
          ></div>
        </div>
      {/each}
      {#if boss}
        <div class="boss" style="left: {boss.x}px; top: {boss.y}px;">
          <div class="boss-health-bar">
            <div
              class="boss-health-fill"
              style="width: {(boss.health / bossMaxHealth) * 100}%"
            ></div>
          </div>
          <div class="boss-body"></div>
          <div class="boss-eye"></div>
        </div>
      {/if}
    </div>
    {#if !isGameStarted && !isGameOver}
      {#if isHost}
        <div class="overlay">
          <button on:click={startOrRestartGame}>Start Game</button>
        </div>
      {:else}
        <div class="overlay">Waiting for host to start the game...</div>
      {/if}
    {/if}
    {#if isGameOver}
      {#if isHost}
        <div class="overlay">
          <h2>GAME OVER</h2>
          <button on:click={startOrRestartGame}>Restart Game</button>
        </div>
      {/if}
      {#if !isHost}
        <div class="overlay">
          <h2>GAME OVER</h2>
          <p>Waiting for host to start the game...</p>
        </div>
      {/if}
    {/if}
  </div>
</main>

<style>
  .dead {
    opacity: 0;
  }
  .highlight {
    font-weight: bold;
    font-style: italic;
  }
  .scores {
    margin-bottom: 10px;
  }
  .game-area {
    position: relative;
    width: 1000px;
    height: 500px;
    border: 2px solid black;
  }
  .player {
    position: absolute;
    width: 20px;
    height: 20px;
    background-color: red;
  }
  .player.left {
    transform: rotate(180deg);
  }
  .player.up {
    transform: rotate(270deg);
  }
  .player.down {
    transform: rotate(90deg);
  }
  .bullet {
    position: absolute;
    width: 5px;
    height: 5px;
    background-color: yellowgreen;
    border-radius: 50%;
  }

  .boss-bullet {
    background-color: red;
    width: 8px;
    height: 8px;
  }

  .boss {
    position: absolute;
    width: 200px;
    height: 220px; /* Increased height to accommodate health bar */
  }

  .boss-health-bar {
    position: absolute;
    top: -20px; /* Position above the boss */
    left: 0;
    right: 0;
    height: 10px;
    background-color: #333;
    border: 1px solid #666;
  }

  .boss-health-fill {
    height: 100%;
    background-color: red;
    transition: width 0.3s ease-in-out;
  }

  .boss-body {
    width: 200px;
    height: 200px;
    background-color: #800080;
    border-radius: 50%;
    position: absolute;
    bottom: 0;
    overflow: hidden;
  }

  .boss-eye {
    width: 40px;
    height: 40px;
    background-color: #ff0000;
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  .ping-meter {
    font-weight: bold;
    margin-bottom: 10px;
  }
  .enemy {
    position: absolute;
    width: 20px;
    height: 20px;
    background-color: purple;
  }
  .game-container {
    position: relative;
  }

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
  }

  .overlay h2 {
    font-size: 36px;
    margin-bottom: 20px;
  }

  button {
    margin-bottom: 10px;
    padding: 10px 20px;
    font-size: 18px;
    cursor: pointer;
    background-color: #4caf50;
    color: white;
    border: none;
    border-radius: 5px;
  }

  .player.shielded::after {
    content: "";
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    border-radius: 50%;
    border: 2px solid rgba(0, 255, 255, 0.7);
    animation: pulse 1s infinite alternate;
  }

  @keyframes pulse {
    from {
      transform: scale(1);
      opacity: 0.7;
    }
    to {
      transform: scale(1.1);
      opacity: 1;
    }
  }

  .beam-container {
    position: absolute;
    display: flex;
    align-items: center;
  }
  .enemy-beam {
    background-color: rgba(255, 0, 0, 0.7);
    box-shadow:
      0 0 10px red,
      0 0 20px red;
    animation: sparkle 0.5s linear infinite;
  }
  @keyframes sparkle {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .powerup {
    position: absolute;
    width: 15px;
    height: 15px;
    border-radius: 3px;
    animation: rainbow 2s linear infinite;
  }

  @keyframes rainbow {
    0% {
      background-color: red;
    }
    14% {
      background-color: orange;
    }
    28% {
      background-color: yellow;
    }
    42% {
      background-color: green;
    }
    57% {
      background-color: blue;
    }
    71% {
      background-color: indigo;
    }
    85% {
      background-color: violet;
    }
    100% {
      background-color: red;
    }
  }
</style>
