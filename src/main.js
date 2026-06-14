import { pickFromPool, resetUsedPools } from "./core/pool.js";
import { gameState } from "./core/state.js";
import { BONUS_POINTS } from "./core/scoring.js";
import { getDifficultyMeta, applyDifficulty } from "./core/difficulty.js";
import { advanceTeamTurn, nextAnsweringPlayer } from "./core/turns.js";
import { trackCorrect, resetStreak, acceptDoubleBet, declineDoubleBet, settleDouble } from "./core/double.js";
import { modes } from "./modes/registry.js";
import {
  renderChallenge, updateNewChallengeButton, setAwaitingScore, setRoundLocked,
  clearChallengeArea, highlightOptionButtons, setModeTitleWithDifficulty,
  revealAnswer, revealBonus,
} from "./ui/challenge.js";
import { playSound } from "./audio.js";
import { addToLog } from "./ui/log.js";
import { launchConfetti } from "./ui/confetti.js";
import {
  syncTimerToDuration, updateTimerStartLabel, startTimer, pauseTimer, resetTimer, isTimerRunning,
  setTimerTickCallback,
} from "./ui/timer.js";
import {
  addPoint, updateScoreboardUI, updateTeamTurnDisplay,
  getTeamPlayerNames, updateScoreButtonLabels,
} from "./ui/scoreboard.js";
import {
  openSettingsModal, closeSettingsModal, updateModeButtons, updatePlayerListEmpty,
  setTeamNames, addPlayer, setMode, randomMode,
} from "./ui/settings.js";
import { showDoubleBanner } from "./ui/doubleBanner.js";
import { initKeyboard } from "./ui/keyboard.js";
import { connectAsHost, emitState } from "./socket.js";

// ═══════════════════════════════════════════════════════
//  WEBSOCKET — STATE SNAPSHOT
// ═══════════════════════════════════════════════════════
function buildSnapshot() {
  return {
    score1: gameState.score1,
    score2: gameState.score2,
    team1name: gameState.team1name,
    team2name: gameState.team2name,
    activeTeam: gameState.activeTeam,
    modeTitle: gameState.isRandom
      ? "Random Challenge"
      : (modes[gameState.currentMode]?.title ?? ""),
    spec: gameState.currentSpec,
    currentDifficulty: gameState.currentDifficulty,
    roundPointsFull: gameState.roundPointsFull,
    currentAnsweringPlayer: gameState.currentAnsweringPlayer,
    timerRunning: isTimerRunning(),
    timerSecondsLeft: gameState.timerSecondsLeft,
    roundLocked: gameState.roundLocked,
    doubleActive: gameState.doubleActive,
    doubleTeam: gameState.doubleTeam,
    hostOffline: false,
  };
}

// ═══════════════════════════════════════════════════════
//  POOL PICKER
// ═══════════════════════════════════════════════════════
function resetUsedChallenges(){resetUsedPools();addToLog("Challenge deck reshuffled.");}

// ═══════════════════════════════════════════════════════
//  TIMER
// ═══════════════════════════════════════════════════════
function applyRoundDifficulty(d){
  applyDifficulty(d);
  updateScoreButtonLabels();updateTimerStartLabel();
  syncTimerToDuration();
}

// ═══════════════════════════════════════════════════════
//  SCOREBOARD / TEAMS
// ═══════════════════════════════════════════════════════
function assignAnsweringPlayer(t) {
  const name = nextAnsweringPlayer(t, getTeamPlayerNames(t));
  const pEl = document.getElementById("pickedPlayer"), hEl = document.getElementById("pickedPlayerHint");
  if (!name) { pEl.textContent = ""; hEl.textContent = ""; return; }
  pEl.textContent = "▶ " + name + " answers";
  hEl.textContent = "Correct = +" + gameState.roundPointsFull + " · With help = +" + gameState.roundPointsHelp;
}

// ═══════════════════════════════════════════════════════
//  SCORING
// ═══════════════════════════════════════════════════════
function resetScores(){
  gameState.score1 = 0; gameState.score2 = 0;
  gameState.playerTurnIndex = { 1: 0, 2: 0 };
  gameState.consecutiveCorrect = { 1: 0, 2: 0 };
  gameState.doubleActive=false;gameState.doubleTeam=0;gameState.doubleWaiting=false;
  document.getElementById("score1").textContent=0;
  document.getElementById("score2").textContent=0;
  document.getElementById("scorePanel1").classList.remove("pulse","leading");
  document.getElementById("scorePanel2").classList.remove("pulse","leading");
  document.getElementById("doubleBanner").style.display="none";
  addToLog("Score reset.");
  emitState(buildSnapshot());
}

// ═══════════════════════════════════════════════════════
//  DOUBLE OR NOTHING
//  ─────────────────────────────────────────────────────
//  FLUXO:
//  1. Time acerta 3 seguidos  → checkDoubleOrNothing() → showDoubleBanner()
//  2. Banner aparece, botão "Novo Desafio" BLOQUEADO (doubleWaiting=true)
//  3a. Aceitar  → acceptDouble():  doubleActive=true, doubleWaiting=false,
//                 chama newChallenge() diretamente com double-round ativo
//  3b. Recusar  → declineDouble(): doubleActive=false, doubleWaiting=false,
//                 NÃO chama newChallenge() — professor clica normalmente
//  4. Na rodada dupla, ao marcar certo/errado → resolveDouble(correct, pts)
//     Certo: ganha pts NORMAIS + pts DE BÔNUS (total = pts × 2)
//     Errado: perde os pts da rodada (subtrai)
// ═══════════════════════════════════════════════════════
function checkDoubleOrNothing(team){
  if(trackCorrect(team)) showDoubleBanner(team);
}

function acceptDouble(){
  acceptDoubleBet();
  document.getElementById("doubleBanner").style.display="none";
  document.getElementById("doubleBanner").setAttribute("aria-hidden","true");
  const name=gameState.doubleTeam===1?gameState.team1name:gameState.team2name;
  addToLog("🎲 "+name+" accepted Double or Nothing!");
  updateNewChallengeButton();
  // Launch the next challenge immediately
  newChallenge();
}

function declineDouble(){
  const name=gameState.doubleTeam===1?gameState.team1name:gameState.team2name;
  declineDoubleBet();
  document.getElementById("doubleBanner").style.display="none";
  document.getElementById("doubleBanner").setAttribute("aria-hidden","true");
  addToLog("🛡 "+name+" preferred to play it safe.");
  updateNewChallengeButton();
  // Teacher presses New Challenge manually
}

function resolveDouble(correct, normalPoints){
  document.getElementById("challengePanel").classList.remove("double-round");
  const name=gameState.doubleTeam===1?gameState.team1name:gameState.team2name;
  const { team, delta } = settleDouble(correct, normalPoints);
  addPoint(team, delta);
  if(correct){
    addToLog("🎲 DOUBLE WON! +"+normalPoints+" bonus for "+name+"! (this round total: +"+(normalPoints*2)+")");
    launchConfetti();
  }else{
    addToLog("💥 DOUBLE LOST! "+name+" loses −"+normalPoints+" pts this round.");
  }
}

// ═══════════════════════════════════════════════════════
//  NEW CHALLENGE
// ═══════════════════════════════════════════════════════
function newChallenge(){
  const panel=document.getElementById("challengePanel");
  panel.classList.remove("challenge-panel--idle","challenge-bonus");
  if(gameState.doubleActive)panel.classList.add("double-round");
  else panel.classList.remove("double-round");
  setAwaitingScore(false);setRoundLocked(false);

  if(gameState.isRandom)gameState.currentMode=Math.floor(Math.random()*modes.length);
  const mode=modes[gameState.currentMode];
  const item=pickFromPool(mode.pool,mode.key);
  const spec=mode.render(item);
  gameState.currentSpec = spec;

  gameState.currentAnswer=spec.answer||"";
  gameState.currentAnswerLabel=mode.answerLabel||"answer";
  gameState.bonusAnswer=spec.bonus?spec.bonus.answer:"";
  gameState.bonusRevealed=false;

  renderChallenge(spec,{onOptionSelected:checkAnswer});
  if(spec.panelClass)panel.classList.add(spec.panelClass);

  applyRoundDifficulty(item.difficulty);
  setModeTitleWithDifficulty(gameState.isRandom?"Random Challenge":mode.title,item.difficulty);
  gameState.turnTeam=gameState.activeTeam;
  assignAnsweringPlayer(gameState.turnTeam);
  updateTeamTurnDisplay();
  startTimer();
  const playerNote=gameState.currentAnsweringPlayer?" ("+gameState.currentAnsweringPlayer+" answers)":"";
  const teamName=gameState.activeTeam===1?gameState.team1name:gameState.team2name;
  const doubleNote=gameState.doubleActive?" 🎲 DOUBLE ROUND!":"";
  addToLog(teamName+" — "+mode.title+playerNote+doubleNote);
  advanceTeamTurn();
  updateNewChallengeButton();
  emitState(buildSnapshot());
}

// ═══════════════════════════════════════════════════════
//  MARK CORRECT / WRONG
// ═══════════════════════════════════════════════════════
function markCorrect(kind){
  if(gameState.roundLocked)return;
  kind=kind||"full";
  const name=gameState.turnTeam===1?gameState.team1name:gameState.team2name;
  const diffLabel=getDifficultyMeta(gameState.currentDifficulty).label;
  let points=gameState.roundPointsFull;
  let logMsg="✅ Correct — "+name+" (+"+gameState.roundPointsFull+", "+diffLabel+")";
  if(kind==="help"){
    points=gameState.roundPointsHelp;
    logMsg=gameState.currentAnsweringPlayer
      ?"✅ Correct with help — "+name+" (+"+gameState.roundPointsHelp+"; was "+gameState.currentAnsweringPlayer+")"
      :"✅ Correct with help — "+name+" (+"+gameState.roundPointsHelp+", "+diffLabel+")";
  }else if(gameState.currentAnsweringPlayer){
    logMsg="✅ Correct — "+gameState.currentAnsweringPlayer+" ("+name+", +"+gameState.roundPointsFull+")";
  }

  // 1. Add normal points
  addPoint(gameState.turnTeam,points);
  playSound("correct");
  if(points>=gameState.roundPointsHelp)launchConfetti();
  addToLog(logMsg);

  // 2. Resolve double (adds the same points again if correct)
  if(gameState.doubleActive&&gameState.turnTeam===gameState.doubleTeam){
    resolveDouble(true,points);
  }

  setRoundLocked(true);pauseTimer();
  emitState(buildSnapshot());

  // 3. Show bonus controls if bonus exists and not yet given
  if(gameState.bonusAnswer&&!gameState.bonusRevealed){
    const rb=document.getElementById("revealBonusBtn");
    rb.style.display="inline-block";rb.style.pointerEvents="auto";rb.style.opacity="1";
  }

  // 4. Track consecutive for Double-or-Nothing trigger
  if(kind!=="help")checkDoubleOrNothing(gameState.turnTeam);
  else resetStreak(gameState.turnTeam);
}

function markWrong(){
  if(gameState.roundLocked)return;
  const name=gameState.turnTeam===1?gameState.team1name:gameState.team2name;
  let msg="❌ Wrong — "+name;
  if(gameState.currentAnswer){const label=gameState.currentAnswerLabel;msg+=" ("+label+": "+gameState.currentAnswer+")";}

  // Resolve double as loss BEFORE resetting
  if(gameState.doubleActive&&gameState.turnTeam===gameState.doubleTeam)resolveDouble(false,gameState.roundPointsFull);

  resetStreak(gameState.turnTeam);
  playSound("wrong");
  addToLog(msg);
  setRoundLocked(true);pauseTimer();
  emitState(buildSnapshot());

  // Still allow bonus even if main was wrong
  if(gameState.bonusAnswer&&!gameState.bonusRevealed){
    const rb=document.getElementById("revealBonusBtn");
    rb.style.display="inline-block";rb.style.pointerEvents="auto";rb.style.opacity="1";
  }
}

function checkAnswer(selected){
  if(gameState.roundLocked)return;
  if(highlightOptionButtons(selected)){
    const teamName=gameState.turnTeam===1?gameState.team1name:gameState.team2name;
    const player=gameState.currentAnsweringPlayer?gameState.currentAnsweringPlayer+" ":"";
    addToLog(teamName+" — "+player+"selected: "+selected);
    pauseTimer();setAwaitingScore(true);
  }
}

function markBonusCorrect(){
  const name=gameState.turnTeam===1?gameState.team1name:gameState.team2name;
  addPoint(gameState.turnTeam,BONUS_POINTS);
  playSound("correct");
  launchConfetti();
  addToLog("✨ Bonus correct! "+name+" +"+BONUS_POINTS+" pts");
  document.getElementById("bonusCorrectBtn").style.display="none";
  document.getElementById("revealBonusBtn").style.display="none";
}

// ═══════════════════════════════════════════════════════
//  WIRING
// ═══════════════════════════════════════════════════════
function wireEvents() {
  document.querySelector(".settings-fab").addEventListener("click", openSettingsModal);
  document.querySelector(".modal-backdrop").addEventListener("click", closeSettingsModal);
  document.querySelector(".modal-close").addEventListener("click", closeSettingsModal);
  document.querySelector(".modal-done").addEventListener("click", closeSettingsModal);
  document.getElementById("randomModeBtn").addEventListener("click", randomMode);
  document.querySelectorAll(".mode-btn").forEach((btn, i) => btn.addEventListener("click", () => setMode(i)));
  document.querySelector(".modal-save-names").addEventListener("click", setTeamNames);
  [1, 2].forEach((t) => {
    document.getElementById("addPlayer" + t + "Btn").addEventListener("click", () => addPlayer(t));
    document.getElementById("player" + t).addEventListener("keydown", (e) => { if (e.key === "Enter") addPlayer(t); });
  });
  document.getElementById("soundEnabled").addEventListener("change", (e) => { gameState.soundEnabled = e.target.checked; });
  document.getElementById("confettiEnabled").addEventListener("change", (e) => { gameState.confettiEnabled = e.target.checked; });
  document.getElementById("resetScoresBtn").addEventListener("click", resetScores);
  document.getElementById("reshuffleBtn").addEventListener("click", resetUsedChallenges);
  document.querySelector(".btn-double-yes").addEventListener("click", acceptDouble);
  document.querySelector(".btn-double-no").addEventListener("click", declineDouble);
  document.getElementById("timerStartBtn").addEventListener("click", startTimer);
  document.getElementById("timerPauseBtn").addEventListener("click", pauseTimer);
  document.getElementById("timerResetBtn").addEventListener("click", resetTimer);
  document.getElementById("revealBtn").addEventListener("click", revealAnswer);
  document.getElementById("revealBonusBtn").addEventListener("click", revealBonus);
  document.querySelector(".btn-correct").addEventListener("click", () => markCorrect("full"));
  document.querySelector(".btn-correct-help").addEventListener("click", () => markCorrect("help"));
  document.getElementById("bonusCorrectBtn").addEventListener("click", markBonusCorrect);
  document.querySelector(".btn-wrong").addEventListener("click", markWrong);
  document.querySelector(".btn-new-challenge").addEventListener("click", newChallenge);
  initKeyboard({
    onNewChallenge: newChallenge,
    onCorrect: () => markCorrect("full"),
    onCorrectHelp: () => markCorrect("help"),
    onWrong: markWrong,
    onStartTimer: () => { if (!isTimerRunning()) startTimer(); },
  });
  setTimerTickCallback(() => emitState(buildSnapshot()));
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
function init() {
  wireEvents();
  applyRoundDifficulty("medium"); updateScoreButtonLabels(); resetTimer();
  updateScoreboardUI(); updateModeButtons();
  updatePlayerListEmpty(1); updatePlayerListEmpty(2);
  clearChallengeArea(); updateNewChallengeButton();
  addToLog("Ready! Easy +4/40s · Medium +5/50s · Hard +6/60s (with help: −1).");
  addToLog("All modes have Bonus (+3 pts). Get 3 right in a row → Double or Nothing! 🎲");
  connectAsHost().then((code) => {
    document.getElementById("roomCodeDisplay").textContent = code;
    document.getElementById("roomCodeBadge").hidden = false;
    addToLog("Room created: " + code + " — students can join at /spectator.html");
  }).catch(() => {
    addToLog("⚠ Could not connect to WebSocket server. Spectator mode unavailable.");
  });
}
init(); // módulo é deferred — DOM já está parseado (substitui window.onload)
