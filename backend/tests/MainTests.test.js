import { vi, describe, it, expect, beforeEach } from "vitest";

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
