import { gameState } from "../core/state.js";
import { addScore, BONUS_POINTS } from "../core/scoring.js";

// ═══════════════════════════════════════════════════════
//  SCOREBOARD / TEAMS
// ═══════════════════════════════════════════════════════
export function updateTeamTurnDisplay(){
  const name=gameState.activeTeam===1?gameState.team1name:gameState.team2name;
  const el=document.getElementById("teamTurn");
  el.textContent=name+" — your turn";
  el.className="team-turn team-turn--"+(gameState.activeTeam===1?"blue":"red");
}
export function updateScoreRosters(){
  [1,2].forEach(t=>{
    const names=Array.from(document.getElementById("team"+t+"list").querySelectorAll("li")).map(li=>li.dataset.name);
    document.getElementById("scoreRoster"+t).textContent=names.join(", ");
  });
}
export function updateScoreboardUI(){
  document.getElementById("scoreTeam1Name").textContent=gameState.team1name;
  document.getElementById("scoreTeam2Name").textContent=gameState.team2name;
  updateScoreRosters();
  document.getElementById("scorePanel1").classList.toggle("leading",gameState.score1>gameState.score2);
  document.getElementById("scorePanel2").classList.toggle("leading",gameState.score2>gameState.score1);
}
export function getTeamPlayerNames(t){return Array.from(document.getElementById("team"+t+"list").querySelectorAll("li")).map(li=>li.dataset.name);}
export function clearAnsweringPlayerDisplay(){gameState.currentAnsweringPlayer="";document.getElementById("pickedPlayer").textContent="";document.getElementById("pickedPlayerHint").textContent="";}
export function updateScoreButtonLabels(){
  document.querySelector(".btn-correct").textContent="Correct (+"+gameState.roundPointsFull+")";
  document.querySelector(".btn-correct-help").textContent="Correct with help (+"+gameState.roundPointsHelp+")";
  const bb=document.getElementById("bonusCorrectBtn");
  if(bb)bb.textContent="✨ Bonus correct (+"+BONUS_POINTS+")";
}

// ═══════════════════════════════════════════════════════
//  SCORING
// ═══════════════════════════════════════════════════════
export function addPoint(team,amount){
  addScore(team,amount);
  document.getElementById("score1").textContent=gameState.score1;
  document.getElementById("score2").textContent=gameState.score2;
  const panel=document.getElementById(team===1?"scorePanel1":"scorePanel2");
  panel.classList.remove("pulse");void panel.offsetWidth;panel.classList.add("pulse");
  updateScoreboardUI();
}
