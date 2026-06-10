import { gameState } from "./state.js";

/** Sorteia um item do pool sem repetir até esgotar (rastreio em gameState.usedPools). */
export function pickFromPool(pool, key) {
  if (!gameState.usedPools[key]) gameState.usedPools[key] = [];
  if (gameState.usedPools[key].length >= pool.length) gameState.usedPools[key] = [];
  let idx;
  do { idx = Math.floor(Math.random() * pool.length); } while (gameState.usedPools[key].includes(idx));
  gameState.usedPools[key].push(idx);
  return pool[idx];
}

export function resetUsedPools() {
  gameState.usedPools = {};
}
