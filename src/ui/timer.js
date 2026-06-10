import { gameState } from "../core/state.js";
import { playSound } from "../audio.js";
import { addToLog } from "./log.js";

// ═══════════════════════════════════════════════════════
//  TIMER
// ═══════════════════════════════════════════════════════
const TIMER_RING_R=42;
const TIMER_RING_LEN=2*Math.PI*TIMER_RING_R;
let timeLeft=60, timerInterval=null;

export function updateTimerStartLabel(){document.getElementById("timerStartBtn").textContent="▶ Start "+gameState.timerDuration+"s";}
export function updateTimerRing(){
  const elapsed=gameState.timerDuration-timeLeft;
  const progress=Math.min(1,Math.max(0,elapsed/gameState.timerDuration));
  const ring=document.getElementById("timerRingProgress");
  ring.style.strokeDasharray=TIMER_RING_LEN;
  ring.style.strokeDashoffset=TIMER_RING_LEN*(1-progress);
  document.getElementById("timerRing").classList.toggle("timer-ring--urgent",timeLeft>0&&timeLeft<=10);
}
export function syncTimerToDuration() {
  timeLeft = gameState.timerDuration;
  document.getElementById("timer").textContent = gameState.timerDuration;
  updateTimerRing();
}
export function startTimer(){
  if(timerInterval)clearInterval(timerInterval);
  timeLeft=gameState.timerDuration;document.getElementById("timer").textContent=gameState.timerDuration;updateTimerRing();
  timerInterval=setInterval(()=>{
    timeLeft--;document.getElementById("timer").textContent=timeLeft;updateTimerRing();
    if(timeLeft>0&&timeLeft<=5)playSound("tick");
    if(timeLeft<=0){clearInterval(timerInterval);timerInterval=null;playSound("timeup");addToLog("⏰ Time's up!");}
  },1000);
}
export function pauseTimer(){if(timerInterval){clearInterval(timerInterval);timerInterval=null;}}
export function resetTimer(){pauseTimer();timeLeft=gameState.timerDuration;document.getElementById("timer").textContent=gameState.timerDuration;updateTimerRing();}
export function isTimerRunning(){return timerInterval !== null;}
