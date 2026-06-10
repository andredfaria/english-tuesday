import { describe, it, expect, beforeEach } from "vitest";
import { gameState, resetGameState } from "../src/core/state.js";
import { trackCorrect, resetStreak, acceptDoubleBet, declineDoubleBet, settleDouble } from "../src/core/double.js";

describe("double or nothing", () => {
  beforeEach(() => resetGameState());

  it("dispara na 3ª correta seguida e zera o streak", () => {
    expect(trackCorrect(1)).toBe(false);
    expect(trackCorrect(1)).toBe(false);
    expect(trackCorrect(1)).toBe(true);
    expect(gameState.consecutiveCorrect[1]).toBe(0);
    expect(gameState.doubleTeam).toBe(1);
  });

  it("streaks são por time; resetStreak zera só o time dado", () => {
    trackCorrect(1); trackCorrect(1);
    trackCorrect(2);
    resetStreak(1);
    expect(gameState.consecutiveCorrect[1]).toBe(0);
    expect(gameState.consecutiveCorrect[2]).toBe(1);
  });

  it("aceitar a aposta ativa o double e dá a vez ao time que apostou", () => {
    trackCorrect(2); trackCorrect(2); trackCorrect(2);
    gameState.doubleWaiting = true;
    acceptDoubleBet();
    expect(gameState.doubleActive).toBe(true);
    expect(gameState.doubleWaiting).toBe(false);
    expect(gameState.activeTeam).toBe(2);
  });

  it("recusar limpa tudo", () => {
    gameState.doubleTeam = 1; gameState.doubleWaiting = true;
    declineDoubleBet();
    expect(gameState.doubleActive).toBe(false);
    expect(gameState.doubleTeam).toBe(0);
    expect(gameState.doubleWaiting).toBe(false);
  });

  it("acertou a rodada dupla → delta positivo; errou → negativo; flags limpas", () => {
    gameState.doubleActive = true; gameState.doubleTeam = 1;
    expect(settleDouble(true, 5)).toEqual({ team: 1, delta: 5 });
    expect(gameState.doubleActive).toBe(false);
    expect(gameState.doubleTeam).toBe(0);

    gameState.doubleActive = true; gameState.doubleTeam = 2;
    expect(settleDouble(false, 6)).toEqual({ team: 2, delta: -6 });
  });
});
