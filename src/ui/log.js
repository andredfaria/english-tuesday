// ═══════════════════════════════════════════════════════
//  LOG
// ═══════════════════════════════════════════════════════
export function addToLog(text){
  const log=document.getElementById("log");
  const time=new Date().toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
  const entry=document.createElement("div");entry.className="log-entry";
  const small=document.createElement("small");small.textContent="["+time+"] "+text;
  entry.appendChild(small);log.appendChild(entry);log.scrollTop=log.scrollHeight;
}
