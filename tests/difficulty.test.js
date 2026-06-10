import { describe, it, expect, beforeEach } from "vitest";
import { gameState, resetGameState } from "../src/core/state.js";
import { DIFFICULTY_META, getDifficultyMeta, applyDifficulty } from "../src/core/difficulty.js";

describe("difficulty", () => {
  beforeEach(() => resetGameState());

  it("easy=4pts/40s, medium=5pts/50s, hard=6pts/60s", () => {
    expect(DIFFICULTY_META.easy).toMatchObject({ points: 4, seconds: 40 });
    expect(DIFFICULTY_META.medium).toMatchObject({ points: 5, seconds: 50 });
    expect(DIFFICULTY_META.hard).toMatchObject({ points: 6, seconds: 60 });
  });

  it("dificuldade desconhecida cai em medium", () => {
    expect(getDifficultyMeta("banana")).toBe(DIFFICULTY_META.medium);
    expect(getDifficultyMeta(undefined)).toBe(DIFFICULTY_META.medium);
  });

  it("applyDifficulty ajusta timer e pontos da rodada (help = full − 1)", () => {
    applyDifficulty("hard");
    expect(gameState.currentDifficulty).toBe("hard");
    expect(gameState.timerDuration).toBe(60);
    expect(gameState.roundPointsFull).toBe(6);
    expect(gameState.roundPointsHelp).toBe(5);
  });
});
