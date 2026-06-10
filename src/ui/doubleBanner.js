import { gameState } from "../core/state.js";
import { playSound } from "../audio.js";
import { updateNewChallengeButton } from "./challenge.js";

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
export function showDoubleBanner(team){
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
