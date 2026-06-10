import { gameState } from "./core/state.js";

// ═══════════════════════════════════════════════════════
//  AUDIO
// ═══════════════════════════════════════════════════════
let audioCtx=null;
function getAudioCtx(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();return audioCtx}
function playBeep(freq,dur,type,vol){
  if(!gameState.soundEnabled)return;
  try{
    const ctx=getAudioCtx();
    if(ctx.state==="suspended")ctx.resume();
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type||"sine";osc.frequency.value=freq;
    gain.gain.setValueAtTime(vol||.15,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+dur);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start();osc.stop(ctx.currentTime+dur);
  }catch(e){}
}
export function playSound(kind){
  if(kind==="tick")    playBeep(880,.07,"square",.1);
  else if(kind==="timeup") playBeep(200,.4,"sawtooth",.18);
  else if(kind==="correct"){playBeep(523,.1,"sine",.14);setTimeout(()=>playBeep(784,.14,"sine",.14),90);}
  else if(kind==="wrong")  playBeep(160,.22,"square",.14);
  else if(kind==="double"){
    playBeep(440,.08,"square",.15);setTimeout(()=>playBeep(554,.08,"square",.15),90);
    setTimeout(()=>playBeep(659,.12,"square",.18),180);setTimeout(()=>playBeep(880,.22,"square",.2),280);
  }
}
