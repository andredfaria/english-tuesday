import { gameState } from "./state.js";

export function advanceTeamTurn() {
  gameState.activeTeam = gameState.activeTeam === 1 ? 2 : 1;
}

/** Round-robin no roster do time. Muda gameState.currentAnsweringPlayer e retorna o nome ("" se vazio). */
export function nextAnsweringPlayer(team, names) {
  if (!names.length) { gameState.currentAnsweringPlayer = ""; return ""; }
  const idx = gameState.playerTurnIndex[team] % names.length;
  gameState.currentAnsweringPlayer = names[idx];
  gameState.playerTurnIndex[team] = (idx + 1) % names.length;
  return gameState.currentAnsweringPlayer;
}
