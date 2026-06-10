import { gameState } from "../core/state.js";
import { addToLog } from "./log.js";
import { updateScoreboardUI, updateScoreRosters, updateTeamTurnDisplay } from "./scoreboard.js";

export function updateModeButtons(){
  document.querySelectorAll(".mode-btn").forEach((btn,i)=>btn.classList.toggle("active",!gameState.isRandom&&gameState.currentMode===i));
  document.getElementById("randomModeBtn").classList.toggle("active",gameState.isRandom);
}
export function openSettingsModal(){
  document.getElementById("team1input").value=gameState.team1name;
  document.getElementById("team2input").value=gameState.team2name;
  document.getElementById("modalTeam1Label").textContent=gameState.team1name;
  document.getElementById("modalTeam2Label").textContent=gameState.team2name;
  updateModeButtons();
  document.getElementById("settingsModal").classList.add("open");
  document.getElementById("settingsModal").setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
}
export function closeSettingsModal(){
  document.getElementById("settingsModal").classList.remove("open");
  document.getElementById("settingsModal").setAttribute("aria-hidden","true");
  document.body.style.overflow="";
  updateScoreRosters();
}
export function updatePlayerListEmpty(t){document.getElementById("team"+t+"empty").style.display=document.getElementById("team"+t+"list").children.length?"none":"block";}
export function setTeamNames(){
  gameState.team1name=document.getElementById("team1input").value.trim()||"Blue Team";
  gameState.team2name=document.getElementById("team2input").value.trim()||"Red Team";
  document.getElementById("modalTeam1Label").textContent=gameState.team1name;
  document.getElementById("modalTeam2Label").textContent=gameState.team2name;
  updateScoreboardUI();updateTeamTurnDisplay();addToLog("Team names updated.");
}
export function addPlayer(t){
  const input=document.getElementById("player"+t),name=input.value.trim();if(!name)return;
  const list=document.getElementById("team"+t+"list");
  if(Array.from(list.querySelectorAll("li")).map(li=>li.dataset.name).includes(name))return;
  const li=document.createElement("li");li.dataset.name=name;
  const span=document.createElement("span");span.textContent=name;
  const rm=document.createElement("button");rm.type="button";rm.className="player-remove";rm.setAttribute("aria-label","Remove "+name);rm.textContent="×";
  rm.onclick=()=>removePlayer(t,li);
  li.appendChild(span);li.appendChild(rm);list.appendChild(li);
  input.value="";input.focus();updatePlayerListEmpty(t);updateScoreRosters();
}
export function removePlayer(t,li){li.remove();updatePlayerListEmpty(t);updateScoreRosters();}
export function setMode(m){gameState.isRandom=false;gameState.currentMode=m;updateModeButtons();}
export function randomMode(){gameState.isRandom=true;updateModeButtons();}
