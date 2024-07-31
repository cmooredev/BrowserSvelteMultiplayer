<script>
  import Background from "./Background.svelte";
  import { onMount } from "svelte";
  import io from "socket.io-client";

  const SOCKET_URL = "http://localhost:3000";
  const socket = io(SOCKET_URL);

  let players = {};
  let bullets = {};
  let enemies = {};
  let powerups = {};
  let sessionId = "";
  let socketId = "";
  let waveNumber = 0;
  let isGameStarted = false;
  let hostSocketId = "";

  let isGameOver = false;

  $: playerEntries = Object.entries(players);
  $: bulletEntries = Object.entries(bullets);
  $: enemyEntries = Object.entries(enemies);
  $: powerupEntries = Object.entries(powerups);
  $: isHost = socketId === hostSocketId;

  const updatePlayers = (changes) => {
    players = { ...players, ...changes };
    Object.keys(changes).forEach(
      (id) => changes[id] == null && delete players[id]
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
    waveNumber = 0;
  };

  const startOrRestartGame = () => {
    clearGameState();
    socket.emit("startGame");
    isGameStarted = true;
    isGameOver = false;
  };

  onMount(() => {
    socket.on("sessionId", ({ sessionId: id, isHost: host }) => {
      sessionId = id;
      socketId = socket.id;
      hostSocketId = host ? socket.id : "";
      console.log(
        `Connected to session ${sessionId} as socket ${socketId}. Is host: ${isHost}`
      );
      clearGameState();
      isGameStarted = false;

      socket.on("gameStateUpdate", (changes) => {
        updatePlayers(changes.players);
        updateBullets(changes.bullets);
        updateEnemies(changes.enemies);
        updatePowerups(changes.powerups);
        waveNumber = changes.waveNumber;
        if (Object.keys(players).length === 0 && isGameStarted) {
          isGameOver = true;
          isGameStarted = false;
        }
      });

      socket.on("gameStarted", () => {
        console.log("gameStarted");
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
    });

    return () => {
      if (socket) {
        socket.off("gameStateUpdate");
        socket.off("gameStarted");
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      }
    };
  });
</script>

<main>
  <h1>Game</h1>
  <div>Session ID: {sessionId.slice(-4)}</div>
  <div>Wave Number: {waveNumber}</div>

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
      {#each playerEntries as [id, { x, y, direction, shield }]}
        <div
          class="player {direction} {shield ? 'shielded' : ''}"
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
      <div class="overlay">
        <h2>GAME OVER</h2>
        <button on:click={startOrRestartGame}>Restart Game</button>
      </div>
    {/if}
  </div>
</main>

<style>
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

  .bullet.enemy-beam {
    background-color: red;
    width: 10px;
    height: 3px;
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
