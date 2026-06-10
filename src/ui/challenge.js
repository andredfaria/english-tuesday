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
