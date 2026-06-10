import { name3Challenges } from "./data/name3.js";
import { emojiPuzzles } from "./data/emoji.js";
import { sentenceChallenges } from "./data/sentence.js";
import { translationChallenges } from "./data/translation.js";
import { oddOneChallenges } from "./data/oddOne.js";
import { rhymeChallenges } from "./data/rhyme.js";
import { describeChallenges } from "./data/describe.js";
import { pickFromPool, resetUsedPools } from "./core/pool.js";
import { gameState } from "./core/state.js";
import { addScore, BONUS_POINTS } from "./core/scoring.js";
import { getDifficultyMeta, applyDifficulty } from "./core/difficulty.js";
import { advanceTeamTurn, nextAnsweringPlayer } from "./core/turns.js";
import { trackCorrect, resetStreak, acceptDoubleBet, declineDoubleBet, settleDouble } from "./core/double.js";

// ═══════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════
const TIMER_RING_R=42;
const TIMER_RING_LEN=2*Math.PI*TIMER_RING_R;
let timeLeft=60, timerInterval=null;
let audioCtx=null;

// ═══════════════════════════════════════════════════════
//  AUDIO
// ═══════════════════════════════════════════════════════
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
function playSound(kind){
  if(kind==="tick")    playBeep(880,.07,"square",.1);
  else if(kind==="timeup") playBeep(200,.4,"sawtooth",.18);
  else if(kind==="correct"){playBeep(523,.1,"sine",.14);setTimeout(()=>playBeep(784,.14,"sine",.14),90);}
  else if(kind==="wrong")  playBeep(160,.22,"square",.14);
  else if(kind==="double"){
    playBeep(440,.08,"square",.15);setTimeout(()=>playBeep(554,.08,"square",.15),90);
    setTimeout(()=>playBeep(659,.12,"square",.18),180);setTimeout(()=>playBeep(880,.22,"square",.2),280);
  }
}

// ═══════════════════════════════════════════════════════
//  CONFETTI
// ═══════════════════════════════════════════════════════
function launchConfetti(){
  if(!gameState.confettiEnabled)return;
  const canvas=document.getElementById("confettiCanvas");
  const ctx=canvas.getContext("2d");
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const colors=["#60a5fa","#ef4444","#fbbf24","#22c55e","#f3f4f6","#a78bfa"];
  const p=[];
  for(let i=0;i<130;i++)p.push({x:Math.random()*canvas.width,y:-Math.random()*canvas.height*.5,vx:(Math.random()-.5)*9,vy:Math.random()*4+3,color:colors[Math.floor(Math.random()*colors.length)],w:Math.random()*10+5,h:Math.random()*6+3,rot:Math.random()*360,vr:(Math.random()-.5)*12});
  let f=0;
  function frame(){
    ctx.clearRect(0,0,canvas.width,canvas.height);let any=false;
    p.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.12;p.rot+=p.vr;if(p.y<canvas.height+30)any=true;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();});
    f++;if(any&&f<200)requestAnimationFrame(frame);else ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  frame();
}

// ═══════════════════════════════════════════════════════
//  POOL PICKER
// ═══════════════════════════════════════════════════════
function resetUsedChallenges(){resetUsedPools();addToLog("Challenge deck reshuffled.");}

// ═══════════════════════════════════════════════════════
//  TIMER
// ═══════════════════════════════════════════════════════
function updateTimerStartLabel(){document.getElementById("timerStartBtn").textContent="▶ Start "+gameState.timerDuration+"s";}
function applyRoundDifficulty(d){
  applyDifficulty(d);
  updateScoreButtonLabels();updateTimerStartLabel();
  timeLeft=gameState.timerDuration;document.getElementById("timer").textContent=gameState.timerDuration;
  updateTimerRing();
}
function difficultyBadgeHtml(d){
  const meta=getDifficultyMeta(d);
  return'<span class="difficulty-badge '+meta.badgeClass+'">'+meta.label+' · +'+meta.points+' · '+meta.seconds+'s</span>';
}
function setModeTitleWithDifficulty(title,d){document.getElementById("modeTitle").innerHTML=title+difficultyBadgeHtml(d);}
function updateScoreButtonLabels(){
  document.querySelector(".btn-correct").textContent="Correct (+"+gameState.roundPointsFull+")";
  document.querySelector(".btn-correct-help").textContent="Correct with help (+"+gameState.roundPointsHelp+")";
  const bb=document.getElementById("bonusCorrectBtn");
  if(bb)bb.textContent="✨ Bonus correct (+"+BONUS_POINTS+")";
}
function updateNewChallengeButton(){
  const btn=document.querySelector(".btn-new-challenge");if(!btn)return;
  const panel=document.getElementById("challengePanel");
  const isIdle=panel&&panel.classList.contains("challenge-panel--idle");
  // Also block if waiting for double decision
  const canNew=(isIdle||gameState.roundLocked)&&!gameState.doubleWaiting;
  btn.disabled=!canNew;
  btn.title=canNew?"":"Score the current round first";
}
function setAwaitingScore(v){
  document.getElementById("challengePanel").classList.toggle("challenge-awaiting-score",v);
  document.getElementById("awaitingScoreNote").style.display=v?"block":"none";
}
function setRoundLocked(v){
  gameState.roundLocked=v;
  document.getElementById("challengePanel").classList.toggle("challenge-locked",v);
  if(v)setAwaitingScore(false);
  updateNewChallengeButton();
}
function getTeamPlayerNames(t){return Array.from(document.getElementById("team"+t+"list").querySelectorAll("li")).map(li=>li.dataset.name);}
function assignAnsweringPlayer(t) {
  const name = nextAnsweringPlayer(t, getTeamPlayerNames(t));
  const pEl = document.getElementById("pickedPlayer"), hEl = document.getElementById("pickedPlayerHint");
  if (!name) { pEl.textContent = ""; hEl.textContent = ""; return; }
  pEl.textContent = "▶ " + name + " answers";
  hEl.textContent = "Correct = +" + gameState.roundPointsFull + " · With help = +" + gameState.roundPointsHelp;
}
function clearAnsweringPlayerDisplay(){gameState.currentAnsweringPlayer="";document.getElementById("pickedPlayer").textContent="";document.getElementById("pickedPlayerHint").textContent="";}
function updateTimerRing(){
  const elapsed=gameState.timerDuration-timeLeft;
  const progress=Math.min(1,Math.max(0,elapsed/gameState.timerDuration));
  const ring=document.getElementById("timerRingProgress");
  ring.style.strokeDasharray=TIMER_RING_LEN;
  ring.style.strokeDashoffset=TIMER_RING_LEN*(1-progress);
  document.getElementById("timerRing").classList.toggle("timer-ring--urgent",timeLeft>0&&timeLeft<=10);
}
function startTimer(){
  if(timerInterval)clearInterval(timerInterval);
  timeLeft=gameState.timerDuration;document.getElementById("timer").textContent=gameState.timerDuration;updateTimerRing();
  timerInterval=setInterval(()=>{
    timeLeft--;document.getElementById("timer").textContent=timeLeft;updateTimerRing();
    if(timeLeft>0&&timeLeft<=5)playSound("tick");
    if(timeLeft<=0){clearInterval(timerInterval);timerInterval=null;playSound("timeup");addToLog("⏰ Time's up!");}
  },1000);
}
function pauseTimer(){if(timerInterval){clearInterval(timerInterval);timerInterval=null;}}
function resetTimer(){pauseTimer();timeLeft=gameState.timerDuration;document.getElementById("timer").textContent=gameState.timerDuration;updateTimerRing();}

// ═══════════════════════════════════════════════════════
//  SCOREBOARD / TEAMS
// ═══════════════════════════════════════════════════════
function updateTeamTurnDisplay(){
  const name=gameState.activeTeam===1?gameState.team1name:gameState.team2name;
  const el=document.getElementById("teamTurn");
  el.textContent=name+" — your turn";
  el.className="team-turn team-turn--"+(gameState.activeTeam===1?"blue":"red");
}
function updateScoreRosters(){
  [1,2].forEach(t=>{
    const names=Array.from(document.getElementById("team"+t+"list").querySelectorAll("li")).map(li=>li.dataset.name);
    document.getElementById("scoreRoster"+t).textContent=names.join(", ");
  });
}
function updateScoreboardUI(){
  document.getElementById("scoreTeam1Name").textContent=gameState.team1name;
  document.getElementById("scoreTeam2Name").textContent=gameState.team2name;
  updateScoreRosters();
  document.getElementById("scorePanel1").classList.toggle("leading",gameState.score1>gameState.score2);
  document.getElementById("scorePanel2").classList.toggle("leading",gameState.score2>gameState.score1);
}
function updateModeButtons(){
  document.querySelectorAll(".mode-btn").forEach((btn,i)=>btn.classList.toggle("active",!gameState.isRandom&&gameState.currentMode===i));
  document.getElementById("randomModeBtn").classList.toggle("active",gameState.isRandom);
}
function openSettingsModal(){
  document.getElementById("team1input").value=gameState.team1name;
  document.getElementById("team2input").value=gameState.team2name;
  document.getElementById("modalTeam1Label").textContent=gameState.team1name;
  document.getElementById("modalTeam2Label").textContent=gameState.team2name;
  updateModeButtons();
  document.getElementById("settingsModal").classList.add("open");
  document.getElementById("settingsModal").setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
}
function closeSettingsModal(){
  document.getElementById("settingsModal").classList.remove("open");
  document.getElementById("settingsModal").setAttribute("aria-hidden","true");
  document.body.style.overflow="";
  updateScoreRosters();
}
function updatePlayerListEmpty(t){document.getElementById("team"+t+"empty").style.display=document.getElementById("team"+t+"list").children.length?"none":"block";}
function setTeamNames(){
  gameState.team1name=document.getElementById("team1input").value.trim()||"Blue Team";
  gameState.team2name=document.getElementById("team2input").value.trim()||"Red Team";
  document.getElementById("modalTeam1Label").textContent=gameState.team1name;
  document.getElementById("modalTeam2Label").textContent=gameState.team2name;
  updateScoreboardUI();updateTeamTurnDisplay();addToLog("Team names updated.");
}
function addPlayer(t){
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
function removePlayer(t,li){li.remove();updatePlayerListEmpty(t);updateScoreRosters();}

// ═══════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════
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
    newChallenge();
  }
  else if(key==="1"){e.preventDefault();markCorrect("full");}
  else if(key==="4"||key==="3"){e.preventDefault();markCorrect("help");}
  else if(key==="2"){e.preventDefault();markWrong();}
  else if(key===" "||e.code==="Space"){e.preventDefault();if(!timerInterval)startTimer();}
});

// ═══════════════════════════════════════════════════════
//  SCORING
// ═══════════════════════════════════════════════════════
function addPoint(team,amount){
  addScore(team,amount);
  document.getElementById("score1").textContent=gameState.score1;
  document.getElementById("score2").textContent=gameState.score2;
  const panel=document.getElementById(team===1?"scorePanel1":"scorePanel2");
  panel.classList.remove("pulse");void panel.offsetWidth;panel.classList.add("pulse");
  updateScoreboardUI();
}
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
}
function setMode(m){gameState.isRandom=false;gameState.currentMode=m;updateModeButtons();}
function randomMode(){gameState.isRandom=true;updateModeButtons();}

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

function showDoubleBanner(team){
  const name=team===1?gameState.team1name:gameState.team2name;
  const pts=gameState.roundPointsFull; // approximate next round value
  document.getElementById("doubleBannerMsg").innerHTML=
    "🔥 <strong>"+name+"</strong> got 3 in a row!<br><br>"+
    "On the <strong>next question</strong>:<br>"+
    "✅ Correct = <strong style='color:#4ade80'>double points</strong> (e.g.: worth "+pts+" → earns "+(pts*2)+")<br>"+
    "❌ Wrong = <strong style='color:#f87171'>lose the round points</strong> (e.g.: −"+pts+")<br><br>"+
    "<small style='color:var(--text-muted)'>The regular bonus (+3) still counts separately!</small>";
  gameState.doubleWaiting=true;
  updateNewChallengeButton();
  const banner=document.getElementById("doubleBanner");
  banner.style.display="flex";banner.setAttribute("aria-hidden","false");
  playSound("double");
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
//  CLEAR CHALLENGE AREA
// ═══════════════════════════════════════════════════════
function clearChallengeArea(){
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

// ═══════════════════════════════════════════════════════
//  HELPER: show bonus UI
// ═══════════════════════════════════════════════════════
function setupBonus(subHtml, answer){
  gameState.bonusAnswer=answer;
  const sub=document.getElementById("subChallengeBox");
  sub.innerHTML=subHtml;sub.style.display="block";
  document.getElementById("revealBonusBtn").style.display="inline-block";
}

// ═══════════════════════════════════════════════════════
//  NEW CHALLENGE
// ═══════════════════════════════════════════════════════
function newChallenge(){
  const panel=document.getElementById("challengePanel");
  panel.classList.remove("challenge-panel--idle","challenge-bonus");
  // If double is active, show double indicator
  if(gameState.doubleActive){panel.classList.add("double-round");}
  else{panel.classList.remove("double-round");}

  setAwaitingScore(false);setRoundLocked(false);
  document.getElementById("challengeText").className="challenge-text";
  document.getElementById("revealBtn").style.display="none";
  document.getElementById("revealBonusBtn").style.display="none";
  document.getElementById("bonusCorrectBtn").style.display="none";
  document.getElementById("optionsArea").innerHTML="";
  document.getElementById("emojiArea").innerHTML="";
  document.getElementById("subChallengeBox").style.display="none";
  document.getElementById("subChallengeBox").innerHTML="";
  gameState.currentAnswer="";gameState.bonusAnswer="";gameState.bonusRevealed=false;

  const titles=["Name 3 Things","Emoji + Sentence","Complete the Sentence","Translation + Negative","Odd One Out","Rhyme Time","Describe It!"];
  let challengeItem,titleText;
  if(gameState.isRandom){gameState.currentMode=Math.floor(Math.random()*7);titleText="Random Challenge";}
  else{titleText=titles[gameState.currentMode];}

  // ── Mode 0: Name 3 Things ──
  if(gameState.currentMode===0){
    challengeItem=pickFromPool(name3Challenges,"name3");
    document.getElementById("challengeText").innerHTML="<strong>"+getN3Prompt(challengeItem)+"</strong><br><small>In English only!</small>";
    gameState.currentAnswer=challengeItem.examples||"Three valid examples in English.";
    document.getElementById("revealBtn").style.display="inline-block";
    // Bonus: use one of those words in a sentence
    const word=(challengeItem.examples||"").split(",")[0].trim();
    if(word) setupBonus(
      "<strong>✍️ Bonus (+"+BONUS_POINTS+" pts):</strong> Use <strong>"+word+"</strong> in an English sentence!",
      "Any correct English sentence using the word \""+word+"\""
    );
  }
  // ── Mode 1: Emoji + Sentence ──
  else if(gameState.currentMode===1){
    challengeItem=pickFromPool(emojiPuzzles,"emoji");
    document.getElementById("challengeText").innerHTML="What is this in English?";
    document.getElementById("emojiArea").innerHTML="<span class='emoji'>"+challengeItem.emoji+"</span>";
    gameState.currentAnswer=challengeItem.answer;
    document.getElementById("revealBtn").style.display="inline-block";
    setupBonus(
      "<strong>✍️ Bonus (+"+BONUS_POINTS+" pts):</strong> Create an English sentence using <strong>"+challengeItem.answer+"</strong>!",
      "Any correct English sentence using \""+challengeItem.answer+"\""
    );
  }
  // ── Mode 2: Complete Sentence ──
  else if(gameState.currentMode===2){
    challengeItem=pickFromPool(sentenceChallenges,"sentence");
    document.getElementById("challengeText").innerHTML="<strong>"+challengeItem.sentence+"</strong>";
    gameState.currentAnswer=challengeItem.answer;
    const area=document.getElementById("optionsArea");
    area.removeAttribute("data-answered");
    challengeItem.options.forEach(opt=>{
      const btn=document.createElement("button");btn.type="button";btn.className="option-btn";
      btn.textContent=opt;btn.dataset.option=opt;
      btn.onclick=()=>checkAnswer(opt);area.appendChild(btn);
    });
    // Bonus: write the full correct sentence
    setupBonus(
      "<strong>✍️ Bonus (+"+BONUS_POINTS+" pts):</strong> Now say the full sentence in English!",
      "The full correct sentence with: "+challengeItem.answer
    );
  }
  // ── Mode 3: Translation + Negative ──
  else if(gameState.currentMode===3){
    challengeItem=pickFromPool(translationChallenges,"translation");
    const dir=challengeItem.type==="en-pt"?"Translate to Portuguese:":"Translate to English:";
    document.getElementById("challengeText").innerHTML="<strong>"+dir+"</strong><br><br><em>"+challengeItem.text+"</em>";
    gameState.currentAnswer=challengeItem.answer;
    document.getElementById("revealBtn").style.display="inline-block";
    if(challengeItem.negative){
      setupBonus(
        "<strong>➕ Bonus (+"+BONUS_POINTS+" pts):</strong> Say the <strong>negative form</strong> of this sentence in English!",
        challengeItem.negative
      );
    }
  }
  // ── Mode 4: Odd One Out ──
  else if(gameState.currentMode===4){
    challengeItem=pickFromPool(oddOneChallenges,"oddone");
    const shuffled=[...challengeItem.items].sort(()=>Math.random()-.5);
    document.getElementById("challengeText").innerHTML="<strong>Which one doesn't belong? (Odd one out)</strong>";
    const area=document.getElementById("optionsArea");
    area.removeAttribute("data-answered");
    shuffled.forEach(opt=>{
      const btn=document.createElement("button");btn.type="button";btn.className="option-btn";
      btn.textContent=opt;btn.dataset.option=opt;
      btn.onclick=()=>checkAnswer(opt);area.appendChild(btn);
    });
    gameState.currentAnswer=challengeItem.odd;
    setupBonus(
      "<strong>🗣️ Bonus (+"+BONUS_POINTS+" pts):</strong> Explain in English <em>why</em> it doesn't belong to the group!",
      challengeItem.reason
    );
  }
  // ── Mode 5: Rhyme Time ──
  else if(gameState.currentMode===5){
    challengeItem=pickFromPool(rhymeChallenges,"rhyme");
    document.getElementById("challengeText").innerHTML="<strong>Name 3 words that rhyme with:</strong><br><span style='font-size:2em;font-weight:800;color:var(--accent-yellow)'>"+challengeItem.word+"</span>";
    gameState.currentAnswer="Exemplos: "+challengeItem.rhymes.slice(0,5).join(", ");
    document.getElementById("revealBtn").style.display="inline-block";
    panel.classList.add("challenge-bonus");
    setupBonus(
      "<strong>✍️ Bonus (+"+BONUS_POINTS+" pts):</strong> Use the word <strong>"+challengeItem.word+"</strong> in an English sentence!",
      "Any correct English sentence using \""+challengeItem.word+"\""
    );
  }
  // ── Mode 6: Describe It! ──
  else if(gameState.currentMode===6){
    challengeItem=pickFromPool(describeChallenges,"describe");
    document.getElementById("challengeText").innerHTML="<strong>Describe this word in English without saying it:</strong><br><span style='font-size:1.8em;font-weight:800;color:var(--accent-purple)'>"+challengeItem.word+"</span>";
    gameState.currentAnswer=challengeItem.word+(challengeItem.ptAnswer?" / "+challengeItem.ptAnswer:"");
    document.getElementById("revealBtn").style.display="inline-block";
    panel.classList.add("challenge-bonus");
    setupBonus(
      "<strong>✍️ Bonus (+"+BONUS_POINTS+" pts):</strong> "+challengeItem.sentence,
      "Any correct English sentence using \""+challengeItem.word+"\""
    );
  }

  applyRoundDifficulty(challengeItem.difficulty);
  setModeTitleWithDifficulty(titleText,challengeItem.difficulty);
  gameState.turnTeam=gameState.activeTeam;
  assignAnsweringPlayer(gameState.turnTeam);
  updateTeamTurnDisplay();
  startTimer();
  const playerNote=gameState.currentAnsweringPlayer?" ("+gameState.currentAnsweringPlayer+" answers)":"";
  const teamName=gameState.activeTeam===1?gameState.team1name:gameState.team2name;
  const doubleNote=gameState.doubleActive?" 🎲 DOUBLE ROUND!":"";
  addToLog(teamName+" — "+titles[gameState.currentMode]+playerNote+doubleNote);
  advanceTeamTurn();
  updateNewChallengeButton();
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
  if(gameState.currentAnswer){const label=(gameState.currentMode===0)?"examples":"answer";msg+=" ("+label+": "+gameState.currentAnswer+")";}

  // Resolve double as loss BEFORE resetting
  if(gameState.doubleActive&&gameState.turnTeam===gameState.doubleTeam)resolveDouble(false,gameState.roundPointsFull);

  resetStreak(gameState.turnTeam);
  playSound("wrong");
  addToLog(msg);
  setRoundLocked(true);pauseTimer();

  // Still allow bonus even if main was wrong
  if(gameState.bonusAnswer&&!gameState.bonusRevealed){
    const rb=document.getElementById("revealBonusBtn");
    rb.style.display="inline-block";rb.style.pointerEvents="auto";rb.style.opacity="1";
  }
}

function highlightOptionButtons(selected){
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

function checkAnswer(selected){
  if(gameState.roundLocked)return;
  if(highlightOptionButtons(selected)){
    const teamName=gameState.turnTeam===1?gameState.team1name:gameState.team2name;
    const player=gameState.currentAnsweringPlayer?gameState.currentAnsweringPlayer+" ":"";
    addToLog(teamName+" — "+player+"selected: "+selected);
    pauseTimer();setAwaitingScore(true);
  }
}

function revealAnswer(){
  if(gameState.roundLocked)return;
  if(gameState.currentAnswer){
    const label=(gameState.currentMode===0)?"Examples":"Answer";
    document.getElementById("challengeText").innerHTML+="<br><br><strong class='answer-reveal' style='font-size:1.2em;'>"+label+": "+gameState.currentAnswer+"</strong>";
    document.getElementById("revealBtn").style.display="none";
    pauseTimer();setAwaitingScore(true);
  }
}

function revealBonus(){
  if(!gameState.bonusAnswer)return;
  const sub=document.getElementById("subChallengeBox");
  sub.innerHTML+="<br><strong class='answer-reveal' style='font-size:1.1em;'>Bonus answer: "+gameState.bonusAnswer+"</strong>";
  document.getElementById("revealBonusBtn").style.display="none";
  gameState.bonusRevealed=true;
  document.getElementById("bonusCorrectBtn").style.display="inline-block";
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
//  LOG
// ═══════════════════════════════════════════════════════
function addToLog(text){
  const log=document.getElementById("log");
  const time=new Date().toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
  const entry=document.createElement("div");entry.className="log-entry";
  const small=document.createElement("small");small.textContent="["+time+"] "+text;
  entry.appendChild(small);log.appendChild(entry);log.scrollTop=log.scrollHeight;
}

// ═══════════════════════════════════════════════════════
//  CHALLENGE DATA
// ═══════════════════════════════════════════════════════
function getN3Prompt(item){return(item&&item.text)?item.text:"";}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
window.onload=function(){
  applyRoundDifficulty("medium");updateScoreButtonLabels();resetTimer();
  updateScoreboardUI();updateModeButtons();
  updatePlayerListEmpty(1);updatePlayerListEmpty(2);
  clearChallengeArea();updateNewChallengeButton();
  addToLog("Ready! Easy +4/40s · Medium +5/50s · Hard +6/60s (with help: −1).");
  addToLog("All modes have Bonus (+3 pts). Get 3 right in a row → Double or Nothing! 🎲");
};

// ── PONTE TEMPORÁRIA (removida na Task 9) ──
// Expõe em window as funções chamadas por handlers inline no index.html.
Object.assign(window, {
  openSettingsModal, closeSettingsModal, randomMode, setMode, setTeamNames,
  addPlayer, resetScores, resetUsedChallenges,
  acceptDouble, declineDouble,
  startTimer, pauseTimer, resetTimer,
  revealAnswer, revealBonus, markCorrect, markBonusCorrect, markWrong,
  newChallenge,
  setSoundEnabled: (v) => { gameState.soundEnabled = v; },
  setConfettiEnabled: (v) => { gameState.confettiEnabled = v; },
});
