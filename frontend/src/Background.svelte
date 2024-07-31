<script>
  let stars = Array(100)
    .fill()
    .map(() => ({
      top: Math.random() * 100 + "%",
      left: Math.random() * 100 + "%",
      animationDuration: Math.random() * 10 + "s",
      speed: Math.random() * 100 + 50,
    }));
</script>

<div class="star-background">
  {#each stars as star}
    <div
      class="star"
      style="top: {star.top}; left: {star.left}; animation-duration: {star.animationDuration}; --speed: {star.speed}px;"
    ></div>
  {/each}
</div>

<style>
  .star-background {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background-color: black;
  }
  .star {
    position: absolute;
    width: 2px;
    height: 2px;
    background: white;
    border-radius: 50%;
    animation:
      twinkle linear infinite,
      move linear infinite 20s;
  }

  @keyframes twinkle {
    0%,
    100% {
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
  }
  @keyframes move {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(calc(-100% - var(--speed)));
    }
  }
</style>
