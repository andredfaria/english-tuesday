import { describe, it, expect, beforeEach } from "vitest";
import { gameState, resetGameState } from "../src/core/state.js";
import { advanceTeamTurn, nextAnsweringPlayer } from "../src/core/turns.js";

describe("turns", () => {
  beforeEach(() => resetGameState());

  it("advanceTeamTurn alterna 1 → 2 → 1", () => {
    expect(gameState.activeTeam).toBe(1);
    advanceTeamTurn();
    expect(gameState.activeTeam).toBe(2);
    advanceTeamTurn();
    expect(gameState.activeTeam).toBe(1);
  });

  it("nextAnsweringPlayer rotaciona o roster em round-robin", () => {
    const names = ["Ana", "Bia", "Caio"];
    expect(nextAnsweringPlayer(1, names)).toBe("Ana");
    expect(nextAnsweringPlayer(1, names)).toBe("Bia");
    expect(nextAnsweringPlayer(1, names)).toBe("Caio");
    expect(nextAnsweringPlayer(1, names)).toBe("Ana");
  });

  it("rosters dos dois times rotacionam de forma independente", () => {
    nextAnsweringPlayer(1, ["Ana", "Bia"]);
    expect(nextAnsweringPlayer(2, ["Davi", "Edu"])).toBe("Davi");
    expect(nextAnsweringPlayer(1, ["Ana", "Bia"])).toBe("Bia");
  });

  it("roster vazio → jogador vazio", () => {
    expect(nextAnsweringPlayer(1, [])).toBe("");
    expect(gameState.currentAnsweringPlayer).toBe("");
  });
});
