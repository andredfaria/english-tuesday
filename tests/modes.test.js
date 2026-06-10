import { describe, it, expect } from "vitest";
import { modes, createRegistry } from "../src/modes/registry.js";

describe("mode registry", () => {
  it("tem os 7 modos na ordem dos botões setMode(0..6)", () => {
    expect(modes.map((m) => m.key)).toEqual([
      "name3", "emoji", "sentence", "translation", "oddone", "rhyme", "describe",
    ]);
  });

  it("todo modo renderiza qualquer item do próprio pool sem DOM", () => {
    modes.forEach((mode) => {
      mode.pool.forEach((item) => {
        const spec = mode.render(item);
        expect(spec.promptHtml, mode.key).toBeTruthy();
        expect(typeof spec.answer, mode.key).toBe("string");
        expect(spec.answer.length, mode.key).toBeGreaterThan(0);
        if (spec.bonus) {
          expect(spec.bonus.html).toBeTruthy();
          expect(spec.bonus.answer).toBeTruthy();
        }
      });
    });
  });

  it("modos de múltipla escolha expõem options contendo a resposta", () => {
    const choice = modes.filter((m) => m.key === "sentence" || m.key === "oddone");
    choice.forEach((mode) => {
      const spec = mode.render(mode.pool[0]);
      expect(spec.options.length).toBeGreaterThan(1);
      expect(spec.options).toContain(spec.answer);
    });
  });

  it("registro rejeita modo sem as propriedades obrigatórias", () => {
    expect(() => createRegistry([{ key: "x" }])).toThrow(/missing required/);
    expect(() => createRegistry([{ key: "x", title: "X", pool: [], render: () => ({}) }])).toThrow(/empty pool/);
  });
});
