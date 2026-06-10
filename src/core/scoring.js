import { gameState } from "./state.js";

export const BONUS_POINTS = 3;

/** Soma (ou subtrai) pontos do time, clampando em ≥ 0. Retorna o novo placar. */
export function addScore(team, amount) {
  const delta = amount === undefined ? 1 : amount;
  if (team === 1) gameState.score1 = Math.max(0, gameState.score1 + delta);
  else gameState.score2 = Math.max(0, gameState.score2 + delta);
  return team === 1 ? gameState.score1 : gameState.score2;
}
