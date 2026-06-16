import { gameState } from "../core/state.js";
import { updateScoreboardUI, updateScoreRosters, updateTeamTurnDisplay } from "./scoreboard.js";

// ── Mode selection ──────────────────────────────────────
function updateLobbyModeButtons() {
  document.querySelectorAll(".mode-btn").forEach((btn, i) =>
    btn.classList.toggle("active", !gameState.isRandom && gameState.currentMode === i)
  );
  document.getElementById("randomModeBtn").classList.toggle("active", gameState.isRandom);
}

function setMode(m) { gameState.isRandom = false; gameState.currentMode = m; updateLobbyModeButtons(); }
function randomMode() { gameState.isRandom = true; updateLobbyModeButtons(); }

// ── Player management ───────────────────────────────────
function updatePlayerListEmpty(t) {
  document.getElementById("team" + t + "empty").style.display =
    document.getElementById("team" + t + "list").children.length ? "none" : "block";
}

function addPlayer(t) {
  const input = document.getElementById("player" + t);
  const name = input.value.trim();
  if (!name) return;
  const list = document.getElementById("team" + t + "list");
  if (Array.from(list.querySelectorAll("li")).map(li => li.dataset.name).includes(name)) return;
  const li = document.createElement("li");
  li.dataset.name = name;
  const span = document.createElement("span");
  span.textContent = name;
  const rm = document.createElement("button");
  rm.type = "button";
  rm.className = "player-remove";
  rm.setAttribute("aria-label", "Remove " + name);
  rm.textContent = "×";
  rm.onclick = () => { li.remove(); updatePlayerListEmpty(t); };
  li.appendChild(span);
  li.appendChild(rm);
  list.appendChild(li);
  input.value = "";
  input.focus();
  updatePlayerListEmpty(t);
}

// ── Play mode visibility ────────────────────────────────
function applyPlayMode(mode) {
  const isInteractive = mode === "interactive";
  // Show/hide "add player" rows (irrelevant in interactive — players self-join)
  document.querySelectorAll(".lobby-add-row").forEach((el) => {
    el.hidden = isInteractive;
  });
  // Show/hide "enable room" checkbox (only relevant in projector mode)
  const roomLabel = document.getElementById("lobbyEnableRoomLabel");
  if (roomLabel) roomLabel.hidden = isInteractive;
}

// ── Public API ──────────────────────────────────────────

/**
 * Wire the lobby form. Call on page load.
 * @param {(enableRoom: boolean) => void} onStart - called after hiding the lobby
 */
export function initLobby(onStart) {
  // Play mode radio
  document.querySelectorAll("input[name='playMode']").forEach((radio) => {
    radio.addEventListener("change", () => applyPlayMode(radio.value));
  });
  applyPlayMode("projector"); // apply initial state

  // Game mode buttons
  document.getElementById("randomModeBtn").addEventListener("click", randomMode);
  document.querySelectorAll(".mode-btn").forEach((btn, i) =>
    btn.addEventListener("click", () => setMode(i))
  );
  updateLobbyModeButtons();

  // Player add buttons + Enter key
  [1, 2].forEach((t) => {
    document.getElementById("addPlayer" + t + "Btn").addEventListener("click", () => addPlayer(t));
    document.getElementById("player" + t).addEventListener("keydown", (e) => {
      if (e.key === "Enter") addPlayer(t);
    });
    updatePlayerListEmpty(t);
  });

  // Start Game
  document.getElementById("startGameBtn").addEventListener("click", () => {
    gameState.playMode = document.querySelector("input[name='playMode']:checked").value;
    gameState.team1name = document.getElementById("team1input").value.trim() || "Blue Team";
    gameState.team2name = document.getElementById("team2input").value.trim() || "Red Team";
    gameState.soundEnabled = document.getElementById("lobbySoundEnabled").checked;
    gameState.confettiEnabled = document.getElementById("lobbyConfettiEnabled").checked;

    // Apply team names to scoreboard before revealing .app
    updateScoreboardUI();
    updateTeamTurnDisplay();
    updateScoreRosters();

    // Hide lobby, reveal game
    document.getElementById("lobby").hidden = true;
    document.querySelector(".app").hidden = false;

    // Interactive mode always creates a room; projector mode checks the checkbox
    const enableRoom = gameState.playMode === "interactive"
      || document.getElementById("lobbyEnableRoom").checked;
    onStart(enableRoom);
  });
}
