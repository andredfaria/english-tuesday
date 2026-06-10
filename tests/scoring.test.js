import { describe, it, expect, beforeEach } from "vitest";
import { gameState, resetGameState } from "../src/core/state.js";
import { addScore, BONUS_POINTS } from "../src/core/scoring.js";

describe("addScore", () => {
  beforeEach(() => resetGameState());

  it("soma pontos ao time certo", () => {
    addScore(1, 5);
    addScore(2, 3);
    expect(gameState.score1).toBe(5);
    expect(gameState.score2).toBe(3);
  });

  it("default é +1 quando amount é omitido", () => {
    addScore(1);
    expect(gameState.score1).toBe(1);
  });

  it("nunca deixa o placar ficar negativo (clamp em 0)", () => {
    addScore(1, 3);
    addScore(1, -10);
    expect(gameState.score1).toBe(0);
  });

  it("retorna o novo placar do time", () => {
    expect(addScore(2, 4)).toBe(4);
  });

  it("BONUS_POINTS é 3", () => {
    expect(BONUS_POINTS).toBe(3);
  });
});
