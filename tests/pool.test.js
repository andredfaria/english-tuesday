import { describe, it, expect, beforeEach } from "vitest";
import { gameState, resetGameState } from "../src/core/state.js";
import { pickFromPool, resetUsedPools } from "../src/core/pool.js";

const pool = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }];

describe("pickFromPool (no-repeat)", () => {
  beforeEach(() => resetGameState());

  it("serve cada item exatamente uma vez antes de repetir", () => {
    const served = new Set();
    for (let i = 0; i < pool.length; i++) served.add(pickFromPool(pool, "k").id);
    expect(served.size).toBe(pool.length);
  });

  it("ao esgotar o pool, reseta e continua servindo sem repetir no novo ciclo", () => {
    const counts = {};
    for (let i = 0; i < pool.length * 2; i++) {
      const it = pickFromPool(pool, "k");
      counts[it.id] = (counts[it.id] || 0) + 1;
    }
    Object.values(counts).forEach((c) => expect(c).toBe(2));
  });

  it("pools com chaves diferentes são independentes", () => {
    for (let i = 0; i < pool.length; i++) pickFromPool(pool, "k1");
    expect(gameState.usedPools["k2"] || []).toHaveLength(0);
  });

  it("inicializa a chave sob demanda (modo novo não exige tocar o state)", () => {
    expect(() => pickFromPool(pool, "chave-nova")).not.toThrow();
    expect(gameState.usedPools["chave-nova"]).toHaveLength(1);
  });

  it("resetUsedPools limpa todo o rastreio", () => {
    pickFromPool(pool, "k");
    resetUsedPools();
    expect(gameState.usedPools).toEqual({});
  });
});
