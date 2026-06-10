import { gameState } from "../core/state.js";
import { closeSettingsModal } from "./settings.js";

// ═══════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════
export function initKeyboard({ onNewChallenge, onCorrect, onCorrectHelp, onWrong, onStartTimer }) {
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&document.getElementById("settingsModal").classList.contains("open")){closeSettingsModal();return;}
    if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA")return;
    if(document.getElementById("settingsModal").classList.contains("open"))return;
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
