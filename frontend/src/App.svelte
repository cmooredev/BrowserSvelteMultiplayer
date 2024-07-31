<script>
  import Background from "./Background.svelte";
  import { onMount } from "svelte";
  import io from "socket.io-client";

  const SOCKET_URL = "http://localhost:3000";
  const socket = io(SOCKET_URL);

  let players = {};
  let bullets = {};
  let enemies = {};
  let sessionId = "";
  let socketId = "";
  let waveNumber = 0;
  let isGameStarted = false;
  let isHost = false;

  //keep players in the same order across clients
  $: playerEntries = Object.entries(players).sort((a, b) =>
    a[0].localeCompare(b[0])
  );
  $: bulletEntries = Object.entries(bullets);
  $: enemyEntries = Object.entries(enemies);
  $: isHost = playerEntries.length > 0 && playerEntries[0][0] === socketId;

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

  const startGame = () => {
    socket.emit("startGame");
    isGameStarted = true; // Add this line
  };

  onMount(() => {
    socket.on("sessionId", (id) => {
      sessionId = id;
      socketId = socket.id;
      console.log(`Connected to session ${sessionId} as socket ${socketId}`);
      players = {};
      bullets = {};
      enemies = {};
      waveNumber = 0;
      isGameStarted = false;

      socket.on("gameStateUpdate", (changes) => {
        updatePlayers(changes.players);
        updateBullets(changes.bullets);
        updateEnemies(changes.enemies);
        waveNumber = changes.waveNumber;
      });

      socket.on("gameStarted", () => {
        isGameStarted = true;
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
  console.log(isGameStarted);
</script>

<main>
  <h1>Game</h1>
  <div>Session ID: {sessionId.slice(-4)}</div>
  <div>Wave Number: {waveNumber}</div>

  <div class="scores">
    {#each playerEntries as [id, { score }], index}
      <div class="player-score {id == socketId ? 'highlight' : ''}">
        Player {index + 1}: {score}
      </div>
    {/each}
  </div>

  <div class="game-container">
    <div class="game-area">
      <Background />
      {#each playerEntries as [id, { x, y, direction }]}
        <div class="player {direction}" style="left: {x}px; top: {y}px;" />
      {/each}
      {#each bulletEntries as [id, { x, y }]}
        <div class="bullet" style="left: {x}px; top: {y}px;" />
      {/each}
      {#each enemyEntries as [id, { x, y }]}
        <div class="enemy" style="left: {x}px; top: {y}px;" />
      {/each}
    </div>
    {#if !isGameStarted && isHost}
      <div class="overlay">
        <button on:click={startGame}>Start Game</button>
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
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.5);
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
</style>
