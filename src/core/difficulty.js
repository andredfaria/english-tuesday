import { gameState } from "./state.js";

export const DIFFICULTY_META = {
  easy:   { points: 4, seconds: 40, label: "Easy",   badgeClass: "difficulty-badge--easy" },
  medium: { points: 5, seconds: 50, label: "Medium", badgeClass: "difficulty-badge--medium" },
  hard:   { points: 6, seconds: 60, label: "Hard",   badgeClass: "difficulty-badge--hard" },
};

export function getDifficultyMeta(d) {
  return DIFFICULTY_META[d] || DIFFICULTY_META.medium;
}

/** Aplica a dificuldade da rodada no estado (timer + pontos). Retorna o meta. */
export function applyDifficulty(d) {
  const meta = getDifficultyMeta(d);
  gameState.currentDifficulty = d;
  gameState.timerDuration = meta.seconds;
  gameState.roundPointsFull = meta.points;
  gameState.roundPointsHelp = meta.points - 1;
  return meta;
}
