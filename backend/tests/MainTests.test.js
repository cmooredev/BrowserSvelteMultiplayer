import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
} from "vitest";
import * as gameState from "../game/gameState";
import { createServer } from "../index";
import http from "http";
import { io as Client } from "socket.io-client";
import { Server } from "socket.io";
import {
  findOrCreateSession,
  clearSessions,
  getSession,
  getAllSessions,
  getAllPlayerSessions,
} from "../game/sessionManager";
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

describe("sessionManager", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    clearSessions();
  });

  it("creates a new session", () => {
    const sessionId = findOrCreateSession(mockSocket, mockIo);
    expect(sessionId).toBeTruthy();
    expect(getSession(sessionId)).toBeDefined();
  });

  it("joins existing session", () => {
    const sessionId1 = findOrCreateSession(mockSocket, mockIo);
    const sessionId2 = findOrCreateSession(
      { ...mockSocket, id: "socket2" },
      mockIo
    );
    expect(sessionId1).toBe(sessionId2);
  });

  it("handles disconnection", () => {
    const sessionId = findOrCreateSession(mockSocket, mockIo);
    const disconnectHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "disconnect"
    )[1];
    disconnectHandler();
    expect(getSession(sessionId)).toBeUndefined();
  });

  it("starts game", () => {
    const sessionId = findOrCreateSession(mockSocket, mockIo);
    const session = getSession(sessionId);
    const startGameHandler = mockSocket.on.mock.calls.find(
      (call) => call[0] === "startGame"
    )[1];

    startGameHandler(session);

    expect(mockIo.to).toHaveBeenCalledWith(sessionId);
    expect(mockEmit).toHaveBeenCalledWith("gameStarted");
    expect(session.gameState.isGameStarted).toBe(true);
  });
});

describe("Load tests", () => {
  let server;
  let port;

  beforeEach(async () => {
    server = createServer();
    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterEach(() => {
    return new Promise((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  const runLoadTest = async (actionType, maxClients, maxActionsPerClient) => {
    const clientStep = 5;
    const actionStep = 10;
    const pingTimeout = 5000; // 5 seconds timeout for each action
    const healthCheckInterval = 2000; // 2 seconds between health checks
    const maxAvgPing = 100; // ms
    const maxPing = 150; // ms

    const healthCheck = () =>
      new Promise((resolve, reject) => {
        const healthClient = Client(`http://localhost:${port}`);
        healthClient.on("connect", () => {
          healthClient.emit("ping");
          healthClient.once("pong", () => {
            healthClient.disconnect();
            resolve();
          });
        });
        healthClient.on("connect_error", reject);
        setTimeout(() => {
          healthClient.disconnect();
          reject(new Error("Health check timeout"));
        }, 5000);
      });

    let lastHealthCheck = Date.now();
    const allStats = [];

    for (
      let clientCount = clientStep;
      clientCount <= maxClients;
      clientCount += clientStep
    ) {
      for (
        let actionsPerClient = 1;
        actionsPerClient <= maxActionsPerClient;
        actionsPerClient += actionStep
      ) {
        const clients = [];
        const pingStats = { total: 0, count: 0, min: Infinity, max: 0 };

        // Create and connect clients
        for (let i = 0; i < clientCount; i++) {
          const client = Client(`http://localhost:${port}`);
          clients.push(client);
        }

        await Promise.all(
          clients.map(
            (client) => new Promise((resolve) => client.on("connect", resolve))
          )
        );

        const actionPromises = clients.flatMap((client) =>
          Array(actionsPerClient)
            .fill()
            .map(() => {
              return new Promise((resolve) => {
                const start = Date.now();
                switch (actionType) {
                  case "move":
                    client.emit(
                      "playerInput",
                      ["left", "right", "up", "down"][
                        Math.floor(Math.random() * 4)
                      ]
                    );
                    break;
                  case "shoot":
                    client.emit("playerInput", "shoot");
                    break;
                  case "combined":
                    client.emit(
                      "playerInput",
                      Math.random() < 0.7
                        ? ["left", "right", "up", "down"][
                            Math.floor(Math.random() * 4)
                          ]
                        : "shoot"
                    );
                    break;
                }
                client.once("gameStateUpdate", () => {
                  const latency = Date.now() - start;
                  resolve({ latency, timedOut: false });
                });
                setTimeout(
                  () => resolve({ latency: pingTimeout, timedOut: true }),
                  pingTimeout
                );
              });
            })
        );

        const results = await Promise.all(actionPromises);

        // Process results
        results.forEach(({ latency, timedOut }) => {
          if (timedOut) {
            pingStats.count++;
            pingStats.max = Math.max(pingStats.max, latency);
          } else {
            pingStats.total += latency;
            pingStats.count++;
            pingStats.min = Math.min(pingStats.min, latency);
            pingStats.max = Math.max(pingStats.max, latency);
          }
        });

        // Calculate average ping
        const avgPing = pingStats.total / pingStats.count;

        allStats.push({
          clients: clientCount,
          actionsPerClient,
          avgPing,
          minPing: pingStats.min,
          maxPing: pingStats.max,
          timeouts: results.filter((r) => r.timedOut).length,
        });

        // Cleanup
        await Promise.all(
          clients.map(
            (client) =>
              new Promise((resolve) => {
                client.disconnect();
                resolve();
              })
          )
        );

        // Perform health check if needed
        if (Date.now() - lastHealthCheck > healthCheckInterval) {
          try {
            await healthCheck();
            console.log("Health check passed");
            lastHealthCheck = Date.now();
          } catch (error) {
            console.error("Health check failed:", error.message);
            console.log(
              `\nSummary for ${actionType} test (incomplete due to health check failure):`
            );
            console.table(allStats);
            return;
          }
        }

        // Check if the server is still performing acceptably
        if (avgPing > maxAvgPing || pingStats.max > maxPing) {
          console.log(
            `Performance threshold exceeded at ${clientCount} clients and ${actionsPerClient} actions per client`
          );
          console.log(
            `Avg ping: ${avgPing.toFixed(2)}ms, Max ping: ${pingStats.max}ms`
          );
          break;
        }
      }
    }

    console.log(`\nSummary for ${actionType} test:`);
    console.table(allStats);
    console.log(
      `Server handled maximum ${actionType} load without exceeding performance threshold`
    );
  };

  it("should measure server performance for movement only", async () => {
    await runLoadTest("move", 500, 100);
  }, 600000);

  it("should measure server performance for shooting only", async () => {
    await runLoadTest("shoot", 500, 100);
  }, 600000);

  it("should measure server performance for combined movement and shooting", async () => {
    await runLoadTest("combined", 500, 100);
  }, 600000);
});

describe("Stress test for session management", () => {
  let server;
  let port;

  beforeAll(() => {
    clearSessions(); // Clear sessions once before all tests in this describe block
  });

  beforeEach(async () => {
    server = createServer();
    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterEach(() => {
    return new Promise((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });

  it("should handle rapid connections and disconnections without ghost sessions", async () => {
    const numClients = 100;
    const connectionsPerClient = 5;
    const clients = [];

    for (let i = 0; i < numClients; i++) {
      const client = Client(`http://localhost:${port}`);
      clients.push(client);
    }

    const connectDisconnectCycle = async (client) => {
      for (let j = 0; j < connectionsPerClient; j++) {
        await new Promise((resolve) => client.connect().on("connect", resolve));
        await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay
        client.disconnect();
        await new Promise((resolve) => setTimeout(resolve, 50)); // Small delay
      }
    };

    await Promise.all(clients.map(connectDisconnectCycle));

    // Allow time for cleanup
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const allSessions = getAllSessions();
    const sessionCount = Object.keys(allSessions).length;
    const allPlayerSessions = getAllPlayerSessions();
    const playerSessionCount = Object.keys(allPlayerSessions).length;

    expect(sessionCount).toBe(0);
    expect(playerSessionCount).toBe(0);

    clients.forEach((client) => client.close());
  }, 30000);
});
