import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  findOrCreateSession,
  clearSessions,
  getSession,
} from "../game/sessionManager";
import { createServer } from "../index";
import io from "socket.io-client";

// Mock dependencies
vi.mock("../game/gameLoop", () => ({ startGameLoop: vi.fn(() => vi.fn()) }));
vi.mock("../game/gameState", () => ({
  createGameState: vi.fn(() => ({ isGameStarted: false, isGameOver: false })),
  startGame: vi.fn(),
  resetGame: vi.fn(),
}));
vi.mock("../game/players", () => ({
  addPlayer: vi.fn(),
  removePlayer: vi.fn(),
  handlePlayerInput: vi.fn(),
}));

describe("Latency and Connection Tests", () => {
  let server;
  let clientSocket;
  let sessionId;
  const PORT = 3000;

  const mockSocket = {
    id: "socket1",
    emit: vi.fn(),
    join: vi.fn(),
    on: vi.fn(),
  };
  const mockEmit = vi.fn();
  const mockIo = {
    of: vi.fn(() => ({ emit: vi.fn() })),
    to: vi.fn(() => ({ emit: mockEmit })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    clearSessions();

    server = createServer();
    await new Promise((resolve) => server.listen(PORT, resolve));

    clientSocket = io(`http://localhost:${PORT}`, {
      transports: ["websocket"],
      "force new connection": true,
    });

    await new Promise((resolve) => clientSocket.on("connect", resolve));

    // Manually create a session
    sessionId = findOrCreateSession(mockSocket, mockIo);
  });

  afterEach(async () => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
    await new Promise((resolve) => server.close(resolve));
    clearSessions();
  });

  it("handles high latency connections", async () => {
    const latency = 500; // 500ms latency
    vi.useFakeTimers();

    const pingPromise = new Promise((resolve) => {
      clientSocket.emit("ping");
      clientSocket.on("pong", resolve);
    });

    vi.advanceTimersByTime(latency);
    await pingPromise;

    const session = getSession(sessionId);
    expect(session).toBeDefined();
    expect(Object.keys(session.players).length).toBeGreaterThan(0);
  });
  it("handles multiple connections and measures latency under load", async () => {
    const numClients = 500;
    const clients = [];
    const latencies = [];
    const sessionIds = new Set();

    // Create multiple client connections
    for (let i = 0; i < numClients; i++) {
      const client = io(`http://localhost:${PORT}`, {
        transports: ["websocket"],
        "force new connection": true,
      });
      await new Promise((resolve) => {
        client.on("connect", () => {
          client.on("sessionId", ({ sessionId }) => {
            sessionIds.add(sessionId);
            resolve();
          });
        });
      });
      clients.push(client);
    }

    // Measure latency for each client
    await Promise.all(
      clients.map(async (client) => {
        const start = Date.now();
        await new Promise((resolve) => {
          client.emit("ping");
          client.on("pong", resolve);
        });
        const end = Date.now();
        latencies.push(end - start);
      })
    );

    // Calculate average latency
    const avgLatency =
      latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

    console.log(`Average latency under load: ${avgLatency}ms`);
    console.log(`Max latency: ${Math.max(...latencies)}ms`);
    console.log(`Min latency: ${Math.min(...latencies)}ms`);
    console.log(`Unique sessions created: ${sessionIds.size}`);

    expect(avgLatency).toBeLessThan(1000);
    expect(sessionIds.size).toBe(numClients / 2 + 1);

    // Clean up clients
    clients.forEach((client) => client.disconnect());
  });
});
