/**
 * Estado mutável único do jogo. Mesma semântica dos antigos globais soltos —
 * sem store reativa: quem muda o estado chama a função de UI correspondente.
 */
function createInitialState() {
  return {
    score1: 0, score2: 0,
    team1name: "Blue Team", team2name: "Red Team",
    activeTeam: 1, turnTeam: 1,
    currentMode: 0, isRandom: true,
    timerDuration: 50,
    soundEnabled: true, confettiEnabled: true,
    roundLocked: false,
    playerTurnIndex: { 1: 0, 2: 0 },
    currentAnsweringPlayer: "",
    currentDifficulty: "medium",
    roundPointsFull: 5, roundPointsHelp: 4,
    consecutiveCorrect: { 1: 0, 2: 0 },
    doubleActive: false, doubleTeam: 0, doubleWaiting: false,
    bonusRevealed: false, bonusAnswer: "",
    currentAnswer: "", currentAnswerLabel: "answer",
    currentSpec: null,
    timerSecondsLeft: 0,
    usedPools: {},
  };
}

export const gameState = createInitialState();

/** Restaura o estado inicial (uso: testes e reset). */
export function resetGameState() {
  Object.assign(gameState, createInitialState());
}
