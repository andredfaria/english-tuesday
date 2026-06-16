import { gameState } from "../core/state.js";

/**
 * Wire the ⚙ in-game panel. Call on page load (before game starts).
 * resetScoresBtn and reshuffleBtn clicks are wired separately in main.js wireEvents().
 */
export function initInGamePanel() {
  const panel = document.getElementById("inGamePanel");
  const fab = document.querySelector(".settings-fab");

  // Open panel — sync checkboxes to current gameState before showing
  fab.addEventListener("click", () => {
    document.getElementById("igSoundEnabled").checked = gameState.soundEnabled;
    document.getElementById("igConfettiEnabled").checked = gameState.confettiEnabled;
    panel.hidden = false;
  });

  // Close via × button
  document.getElementById("inGamePanelClose").addEventListener("click", () => {
    panel.hidden = true;
  });

  // Close on backdrop click (clicking the dark overlay outside the inner panel)
  panel.addEventListener("click", (e) => {
    if (e.target === panel) panel.hidden = true;
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) panel.hidden = true;
  });

  // Effect toggles — write directly to gameState
  document.getElementById("igSoundEnabled").addEventListener("change", (e) => {
    gameState.soundEnabled = e.target.checked;
  });
  document.getElementById("igConfettiEnabled").addEventListener("change", (e) => {
    gameState.confettiEnabled = e.target.checked;
  });
}
