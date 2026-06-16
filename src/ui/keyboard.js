import { gameState } from "../core/state.js";

// ═══════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════
export function initKeyboard({ onNewChallenge, onCorrect, onCorrectHelp, onWrong, onStartTimer }) {
  document.addEventListener("keydown",e=>{
    if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA")return;
    const panel=document.getElementById("inGamePanel");
    if(panel&&!panel.hidden)return;
    const key=e.key.toLowerCase();
    if(key==="n"){
      e.preventDefault();
      const panel=document.getElementById("challengePanel");
      const isIdle=panel&&panel.classList.contains("challenge-panel--idle");
      if((!isIdle&&!gameState.roundLocked)||gameState.doubleWaiting)return;
      onNewChallenge();
    }
    else if(key==="1"){e.preventDefault();onCorrect();}
    else if(key==="4"||key==="3"){e.preventDefault();onCorrectHelp();}
    else if(key==="2"){e.preventDefault();onWrong();}
    else if(key===" "||e.code==="Space"){e.preventDefault();onStartTimer();}
  });
}
