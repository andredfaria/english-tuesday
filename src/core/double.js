import { gameState } from "./state.js";

export const DOUBLE_STREAK = 3;

/** Registra uma correta sem ajuda. Retorna true quando o time atinge a streak (e arma doubleTeam). */
export function trackCorrect(team) {
  gameState.consecutiveCorrect[team] = (gameState.consecutiveCorrect[team] || 0) + 1;
  if (gameState.consecutiveCorrect[team] >= DOUBLE_STREAK) {
    gameState.consecutiveCorrect[team] = 0;
    gameState.doubleTeam = team;
    return true;
  }
  return false;
}

export function resetStreak(team) {
  gameState.consecutiveCorrect[team] = 0;
}

export function acceptDoubleBet() {
  gameState.doubleActive = true;
  gameState.doubleWaiting = false;
  gameState.activeTeam = gameState.doubleTeam;
}

export function declineDoubleBet() {
  gameState.doubleActive = false;
  gameState.doubleTeam = 0;
  gameState.doubleWaiting = false;
}

/** Liquida a rodada dupla: retorna { team, delta } e limpa as flags. */
export function settleDouble(correct, points) {
  const delta = correct ? points : -points;
  const team = gameState.doubleTeam;
  gameState.doubleActive = false;
  gameState.doubleTeam = 0;
  return { team, delta };
}
