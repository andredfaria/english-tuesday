import { gameState } from "../core/state.js";
import { getDifficultyMeta } from "../core/difficulty.js";
import { clearAnsweringPlayerDisplay } from "./scoreboard.js";
import { pauseTimer } from "./timer.js";

/** Pinta um RenderSpec no painel de desafio. onOptionSelected: callback dos botões de múltipla escolha. */
export function renderChallenge(spec, { onOptionSelected } = {}) {
  const text = document.getElementById("challengeText");
  text.className = "challenge-text";
  text.innerHTML = spec.promptHtml;
  document.getElementById("emojiArea").innerHTML = spec.emojiHtml || "";

  const area = document.getElementById("optionsArea");
  area.innerHTML = "";
  area.removeAttribute("data-answered");
  (spec.options || []).forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "option-btn";
    btn.textContent = opt; btn.dataset.option = opt;
    btn.onclick = () => onOptionSelected && onOptionSelected(opt);
    area.appendChild(btn);
  });

  const sub = document.getElementById("subChallengeBox");
  if (spec.bonus) { sub.innerHTML = spec.bonus.html; sub.style.display = "block"; }
  else { sub.innerHTML = ""; sub.style.display = "none"; }
  document.getElementById("revealBonusBtn").style.display = spec.bonus ? "inline-block" : "none";
  document.getElementById("bonusCorrectBtn").style.display = "none";

  const showReveal = spec.showReveal !== undefined ? spec.showReveal : !(spec.options && spec.options.length);
  document.getElementById("revealBtn").style.display = showReveal ? "inline-block" : "none";
}

export function updateNewChallengeButton(){
  const btn=document.querySelector(".btn-new-challenge");if(!btn)return;
  const panel=document.getElementById("challengePanel");
  const isIdle=panel&&panel.classList.contains("challenge-panel--idle");
  // Also block if waiting for double decision
  const canNew=(isIdle||gameState.roundLocked)&&!gameState.doubleWaiting;
  btn.disabled=!canNew;
  btn.title=canNew?"":"Score the current round first";
}
export function setAwaitingScore(v){
  document.getElementById("challengePanel").classList.toggle("challenge-awaiting-score",v);
  document.getElementById("awaitingScoreNote").style.display=v?"block":"none";
}
export function setRoundLocked(v){
  gameState.roundLocked=v;
  document.getElementById("challengePanel").classList.toggle("challenge-locked",v);
  if(v)setAwaitingScore(false);
  updateNewChallengeButton();
}
export function clearChallengeArea(){
  const panel=document.getElementById("challengePanel");
  panel.classList.add("challenge-panel--idle");
  panel.classList.remove("double-round","challenge-bonus");
  setAwaitingScore(false);setRoundLocked(false);
  document.getElementById("modeTitle").textContent="";
  document.getElementById("teamTurn").textContent="";
  document.getElementById("teamTurn").className="team-turn";
  document.getElementById("challengeText").innerHTML="Click <strong>New Challenge</strong> to start<br><small>N = new · 1 = correct · 4/3 = with help · 2 = wrong · Space = timer</small>";
  document.getElementById("challengeText").className="challenge-text challenge-idle-msg";
  document.getElementById("emojiArea").innerHTML="";
  document.getElementById("optionsArea").innerHTML="";
  document.getElementById("subChallengeBox").style.display="none";
  document.getElementById("subChallengeBox").innerHTML="";
  document.getElementById("revealBtn").style.display="none";
  document.getElementById("revealBonusBtn").style.display="none";
  document.getElementById("bonusCorrectBtn").style.display="none";
  gameState.currentAnswer="";gameState.bonusAnswer="";gameState.bonusRevealed=false;
  clearAnsweringPlayerDisplay();
}
export function highlightOptionButtons(selected){
  const area=document.getElementById("optionsArea");
  if(!area.querySelector(".option-btn"))return null;
  if(area.dataset.answered==="1")return false;
  area.dataset.answered="1";
  area.querySelectorAll(".option-btn").forEach(btn=>{
    const opt=btn.dataset.option;
    btn.classList.remove("option-btn--correct","option-btn--wrong","option-btn--reveal-correct");
    if(opt===selected&&opt===gameState.currentAnswer)btn.classList.add("option-btn--correct");
    else if(opt===selected)btn.classList.add("option-btn--wrong");
    else if(opt===gameState.currentAnswer)btn.classList.add("option-btn--reveal-correct");
  });
  return true;
}
export function difficultyBadgeHtml(d){
  const meta=getDifficultyMeta(d);
  return'<span class="difficulty-badge '+meta.badgeClass+'">'+meta.label+' · +'+meta.points+' · '+meta.seconds+'s</span>';
}
export function setModeTitleWithDifficulty(title,d){document.getElementById("modeTitle").innerHTML=title+difficultyBadgeHtml(d);}
export function revealAnswer(){
  if(gameState.roundLocked)return;
  if(gameState.currentAnswer){
    const label=gameState.currentAnswerLabel.charAt(0).toUpperCase()+gameState.currentAnswerLabel.slice(1);
    document.getElementById("challengeText").innerHTML+="<br><br><strong class='answer-reveal' style='font-size:1.2em;'>"+label+": "+gameState.currentAnswer+"</strong>";
    document.getElementById("revealBtn").style.display="none";
    pauseTimer();setAwaitingScore(true);
  }
}
export function revealBonus(){
  if(!gameState.bonusAnswer)return;
  const sub=document.getElementById("subChallengeBox");
  sub.innerHTML+="<br><strong class='answer-reveal' style='font-size:1.1em;'>Bonus answer: "+gameState.bonusAnswer+"</strong>";
  document.getElementById("revealBonusBtn").style.display="none";
  gameState.bonusRevealed=true;
  document.getElementById("bonusCorrectBtn").style.display="inline-block";
}
