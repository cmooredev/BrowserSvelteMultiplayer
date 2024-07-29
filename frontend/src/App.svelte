<script>
  import { onMount } from "svelte";
  import io from "socket.io-client";

  const SOCKET_URL = "http://localhost:3000";
  const socket = io(SOCKET_URL);

  let players = {};
  let bullets = {};

  $: playerEntries = Object.entries(players);
  $: bulletEntries = Object.entries(bullets);

  const updatePlayers = (changes) => {
    players = { ...players, ...changes };
    Object.keys(changes).forEach(
      (id) => changes[id] == null && delete players[id]
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

  onMount(() => {
    socket.on("gameStateUpdate", (changes) => {
      console.log("Game state changes", changes);
      updatePlayers(changes.players);
      updateBullets(changes.bullets);
    });

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      socket.off("gameStateUpdate");
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  });
</script>

<main>
  <h1>Game</h1>

  <div class="game-area">
    {#each playerEntries as [id, { x, y, direction }]}
      <div class="player {direction}" style="left: {x}px; top: {y}px;" />
    {/each}
    {#each bulletEntries as [id, { x, y }]}
      <div class="bullet" style="left: {x}px; top: {y}px;" />
    {/each}
  </div>
</main>

<style>
  .game-area {
    position: relative;
    width: 400px;
    height: 400px;
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
</style>
