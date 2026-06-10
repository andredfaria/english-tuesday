import { gameState } from "../core/state.js";

// ═══════════════════════════════════════════════════════
//  CONFETTI
// ═══════════════════════════════════════════════════════
export function launchConfetti(){
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
