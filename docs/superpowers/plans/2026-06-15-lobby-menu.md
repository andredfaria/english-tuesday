# Lobby / Initial Menu Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Settings modal with a full-screen lobby that the teacher configures before the game starts, and a compact in-game panel (⚙) for mid-session actions.

**Architecture:** Same `index.html` entry point — the `#lobby` div covers the screen on load while `.app` is hidden; clicking "Start Game" reads the form into `gameState`, hides `#lobby`, shows `.app`, and calls `init()`. The existing Settings modal is removed entirely; a new `#inGamePanel` (floating) handles in-game actions.

**Tech Stack:** Vanilla JS ES modules, Vite, existing CSS custom properties from `styles/base.css`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `index.html` | Modify | Add `#lobby`, add `#inGamePanel`, remove `#settingsModal`, hide `.app` initially |
| `styles/lobby.css` | Create | Full-screen lobby layout |
| `styles/components.css` | Modify | Remove modal-specific rules (lines 56–84) |
| `src/ui/lobby.js` | Create | Lobby form logic: mode selection, players, team names, "Start Game" |
| `src/ui/inGamePanel.js` | Create | ⚙ panel: open/close, effect toggles (wires `#igSoundEnabled`, `#igConfettiEnabled`) |
| `src/main.js` | Modify | Remove settings.js import+usage; add lobby/inGamePanel imports; change bottom auto-call |
| `src/ui/settings.js` | Delete | All functionality migrated to lobby.js + inGamePanel.js |

---

## Task 1: Update `index.html` — add lobby, in-game panel, remove modal

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Read the current `index.html`**

Read `/home/andre/Projetos/pessoal/english-tuesday/index.html` to understand current structure before editing.

- [ ] **Step 2: Add `hidden` to the `.app` div**

Find the line:
```html
<div class="app">
```
Change it to:
```html
<div class="app" hidden>
```

- [ ] **Step 3: Add the lobby div**

Add this block immediately after the `<body>` tag (before the `<button class="settings-fab">` line):

```html
<!-- ═══ LOBBY (shown on load, hidden after Start Game) ═══ -->
<div id="lobby" class="lobby">
  <div class="lobby-inner">
    <h1 class="lobby-title">🎮 English Tuesday</h1>
    <p class="lobby-subtitle">Team Battle!</p>

    <section class="lobby-section">
      <h2 class="lobby-section-title">Game Mode</h2>
      <div class="lobby-modes">
        <button type="button" class="random-btn active" id="randomModeBtn">Random</button>
        <button type="button" class="mode-btn">Name 3 Things</button>
        <button type="button" class="mode-btn">Emoji + Sentence</button>
        <button type="button" class="mode-btn">Complete the Sentence</button>
        <button type="button" class="mode-btn">Translation + Negative</button>
        <button type="button" class="mode-btn">Odd One Out</button>
        <button type="button" class="mode-btn">Rhyme Time</button>
        <button type="button" class="mode-btn">Describe It!</button>
      </div>
    </section>

    <section class="lobby-section">
      <h2 class="lobby-section-title">Teams</h2>
      <div class="lobby-teams">
        <div class="lobby-team lobby-team--blue">
          <label class="lobby-team-label">Team 1 name
            <input type="text" id="team1input" value="Blue Team">
          </label>
          <div class="lobby-add-row">
            <input type="text" id="player1" placeholder="Player name">
            <button type="button" id="addPlayer1Btn">Add</button>
          </div>
          <ul id="team1list"></ul>
          <p class="lobby-empty" id="team1empty">No players yet</p>
        </div>
        <div class="lobby-team lobby-team--red">
          <label class="lobby-team-label">Team 2 name
            <input type="text" id="team2input" value="Red Team">
          </label>
          <div class="lobby-add-row">
            <input type="text" id="player2" placeholder="Player name">
            <button type="button" id="addPlayer2Btn">Add</button>
          </div>
          <ul id="team2list"></ul>
          <p class="lobby-empty" id="team2empty">No players yet</p>
        </div>
      </div>
    </section>

    <section class="lobby-section">
      <h2 class="lobby-section-title">Effects</h2>
      <div class="settings-row">
        <label><input type="checkbox" id="lobbySoundEnabled" checked> Sounds</label>
        <label><input type="checkbox" id="lobbyConfettiEnabled" checked> Confetti on correct</label>
      </div>
    </section>

    <button type="button" id="startGameBtn" class="lobby-start-btn">▶ Start Game</button>
  </div>
</div>
```

- [ ] **Step 4: Add the in-game panel div**

Add this block immediately after the `#roomCodeBadge` div and before the `#doubleBanner` div:

```html
<!-- ═══ IN-GAME PANEL (⚙ during game) ═══ -->
<div id="inGamePanel" class="in-game-panel" hidden>
  <div class="in-game-panel-inner">
    <button type="button" id="inGamePanelClose" class="in-game-panel-close" aria-label="Close">×</button>
    <h3 class="in-game-panel-title">Game Options</h3>
    <div class="settings-row">
      <label><input type="checkbox" id="igSoundEnabled" checked> Sounds</label>
      <label><input type="checkbox" id="igConfettiEnabled" checked> Confetti</label>
    </div>
    <button type="button" class="settings-reset-btn" id="resetScoresBtn">Reset scores</button>
    <button type="button" class="settings-reset-btn" id="reshuffleBtn">Reshuffle challenges</button>
  </div>
</div>
```

- [ ] **Step 5: Remove the entire `#settingsModal` block**

Delete from `<div id="settingsModal" class="modal" aria-hidden="true">` through its closing `</div>` (the entire modal block, roughly lines 18–79 in the original file). The result should have no `#settingsModal` element.

- [ ] **Step 6: Add lobby.css link in `<head>`**

After the existing stylesheet links, add:
```html
<link rel="stylesheet" href="./styles/lobby.css">
```

- [ ] **Step 7: Verify HTML is valid (no missing closing tags)**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday && npm run build 2>&1 | head -30
```

Expected: build succeeds with no errors. If it fails, read the error and fix the HTML structure.

- [ ] **Step 8: Commit**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday
git add index.html
git commit -m "feat: add lobby + in-game panel HTML, remove settings modal"
```

---

## Task 2: Create `styles/lobby.css`

**Files:**
- Create: `styles/lobby.css`

- [ ] **Step 1: Create the file**

```css
/* ─── Lobby / initial menu screen ─── */

.lobby {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: var(--bg, #0f1117);
  overflow-y: auto;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem 3rem;
}

.lobby-inner {
  width: 100%;
  max-width: 680px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.lobby-title {
  font-size: clamp(1.8rem, 5vw, 2.8rem);
  font-weight: 800;
  margin: 0 0 4px;
  text-align: center;
}

.lobby-subtitle {
  font-size: 1rem;
  color: var(--text-muted, #9ca3af);
  text-align: center;
  margin: 0 0 2rem;
}

/* ── Sections ── */
.lobby-section {
  margin-bottom: 1.75rem;
}

.lobby-section-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted, #9ca3af);
  margin: 0 0 0.75rem;
}

/* ── Mode buttons ── */
.lobby-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.lobby-modes button {
  margin: 0;
}

/* ── Teams ── */
.lobby-teams {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

@media (max-width: 560px) {
  .lobby-teams { grid-template-columns: 1fr; }
}

.lobby-team {
  background: var(--bg-deep, #080b12);
  border-radius: 14px;
  padding: 1rem;
  border: 1px solid var(--border, #2a2a2a);
}

.lobby-team--blue {
  border-color: rgba(59, 130, 246, 0.45);
  box-shadow: inset 0 0 24px rgba(59, 130, 246, 0.08);
}

.lobby-team--red {
  border-color: rgba(239, 68, 68, 0.35);
  box-shadow: inset 0 0 24px rgba(239, 68, 68, 0.05);
}

.lobby-team-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85em;
  font-weight: 600;
  color: var(--text-muted, #9ca3af);
  margin-bottom: 0.75rem;
}

.lobby-team-label input {
  width: 100%;
}

.lobby-add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 0.75rem;
}

.lobby-add-row input {
  flex: 1;
  min-width: 0;
}

.lobby-add-row button {
  flex-shrink: 0;
  background: var(--accent-yellow, #fbbf24);
  color: #1a1508;
  border-color: var(--accent-yellow, #fbbf24);
}

.lobby-team ul {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 160px;
  overflow-y: auto;
}

.lobby-team li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 10px;
  margin-bottom: 5px;
  background: var(--surface-raised, #1e2130);
  border: 1px solid var(--border, #2a2a2a);
  border-radius: 8px;
  font-size: 0.9em;
}

.lobby-empty {
  opacity: 0.55;
  font-size: 0.85em;
  text-align: center;
  padding: 8px 0;
  margin: 0;
}

/* ── Start button ── */
.lobby-start-btn {
  display: block;
  width: 100%;
  margin-top: 0.5rem;
  padding: 16px;
  font-size: 1.25rem;
  font-weight: 700;
  background: var(--accent-green, #22c55e);
  color: #052e16;
  border-color: var(--accent-green, #22c55e);
  border-radius: 14px;
  box-shadow: 0 0 32px rgba(34, 197, 94, 0.3);
  letter-spacing: 0.02em;
}

.lobby-start-btn:hover {
  background: #16a34a;
  border-color: #16a34a;
  box-shadow: 0 0 48px rgba(34, 197, 94, 0.45);
  transform: translateY(-1px);
}
```

- [ ] **Step 2: Verify Vite still builds**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday && npm run build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday
git add styles/lobby.css
git commit -m "feat: lobby CSS — full-screen pre-game configuration screen"
```

---

## Task 3: Add in-game panel styles to `styles/components.css` and remove modal rules

**Files:**
- Modify: `styles/components.css`

- [ ] **Step 1: Read `styles/components.css`**

Read `/home/andre/Projetos/pessoal/english-tuesday/styles/components.css`.

- [ ] **Step 2: Remove the modal-related CSS rules**

Delete the following rules from `components.css` (they correspond to the removed `#settingsModal`):

Remove these class rules (they appear between `.settings-fab:hover` and `@keyframes scorePop`):
- `.settings-section { ... }` and `.settings-section h3 { ... }`
- `.settings-modes { ... }` and `.settings-modes button { ... }`
- `.modal { ... }`
- `.modal.open { ... }`
- `.modal-backdrop { ... }`
- `.modal-dialog { ... }` and `.modal-dialog h2 { ... }`
- `.modal-close { ... }` and `.modal-close:hover { ... }`
- `.modal-names { ... }` and `.modal-names label { ... }` and `.modal-names input { ... }`
- `.modal-save-names { ... }`
- `.modal-columns { ... }`
- `@media(max-width:560px){.modal-columns,.modal-names{...}}`
- `.modal-team { ... }` (all variants including `--blue` and `--red`)
- `.modal-add-row { ... }` (all sub-rules)
- `.modal-team ul { ... }` and `.modal-team li { ... }`
- `.player-remove { ... }`
- `.modal-empty { ... }`
- `.modal-done { ... }`

Keep: `.settings-row`, `.settings-reset-btn`, `.settings-fab`, `.random-btn`, `.mode-btn`, `.player-remove` (reused in lobby player list).

- [ ] **Step 3: Add in-game panel styles at the end of `components.css`** (before the closing `@media` block)

```css
/* ── In-game panel (⚙ during game) ── */
.in-game-panel {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.in-game-panel[hidden] { display: none; }

.in-game-panel-inner {
  position: relative;
  background: linear-gradient(165deg, var(--surface-raised, #1e2130) 0%, var(--surface, #161922) 100%);
  border: 1px solid var(--border-strong, #3a3f55);
  border-radius: 20px;
  padding: 28px 24px 24px;
  min-width: 280px;
  max-width: 360px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.65);
}

.in-game-panel-title {
  margin: 0 0 4px;
  font-size: 0.8em;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted, #9ca3af);
}

.in-game-panel-close {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  background: var(--bg-deep, #080b12);
  border: 1px solid var(--border, #2a2a2a);
  color: var(--text-muted, #9ca3af);
  font-size: 1.3em;
  line-height: 1;
}
.in-game-panel-close:hover { color: var(--text); }
```

- [ ] **Step 4: Run existing tests**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday && npm test
```

Expected: all 26 tests pass (CSS changes don't affect JS tests).

- [ ] **Step 5: Commit**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday
git add styles/components.css
git commit -m "feat: add in-game panel styles, remove modal CSS"
```

---

## Task 4: Create `src/ui/lobby.js`

**Files:**
- Create: `src/ui/lobby.js`

- [ ] **Step 1: Create the file**

```js
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

// ── Public API ──────────────────────────────────────────

/**
 * Wire the lobby form. Call on page load.
 * @param {() => void} onStart - called after hiding the lobby when teacher clicks Start Game
 */
export function initLobby(onStart) {
  // Mode buttons
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

    onStart();
  });
}
```

- [ ] **Step 2: Verify no import errors**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday && npm run build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday
git add src/ui/lobby.js
git commit -m "feat: lobby.js — pre-game mode/team/player configuration"
```

---

## Task 5: Create `src/ui/inGamePanel.js`

**Files:**
- Create: `src/ui/inGamePanel.js`

- [ ] **Step 1: Create the file**

```js
import { gameState } from "../core/state.js";

/**
 * Wire the ⚙ in-game panel. Call on page load (before game starts).
 * resetScores and reshuffleBtn are wired separately in main.js wireEvents().
 */
export function initInGamePanel() {
  const panel = document.getElementById("inGamePanel");
  const fab = document.querySelector(".settings-fab");

  // Open panel
  fab.addEventListener("click", () => {
    // Sync checkboxes to current gameState before showing
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
```

- [ ] **Step 2: Verify build**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday && npm run build 2>&1 | tail -5
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday
git add src/ui/inGamePanel.js
git commit -m "feat: inGamePanel.js — in-game ⚙ panel for reset/reshuffle/effects"
```

---

## Task 6: Refactor `src/main.js`

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Read `src/main.js`**

Read `/home/andre/Projetos/pessoal/english-tuesday/src/main.js` in full before making any changes.

- [ ] **Step 2: Replace the settings.js import with lobby + inGamePanel imports**

Remove this import block:
```js
import {
  openSettingsModal, closeSettingsModal, updateModeButtons, updatePlayerListEmpty,
  setTeamNames, addPlayer, setMode, randomMode,
} from "./ui/settings.js";
```

Replace it with:
```js
import { initLobby } from "./ui/lobby.js";
import { initInGamePanel } from "./ui/inGamePanel.js";
```

- [ ] **Step 3: Rewrite `wireEvents()` — remove all modal and lobby-related lines**

Replace the entire `wireEvents()` function with this version (removes modal/lobby lines, keeps game lines):

```js
function wireEvents() {
  document.getElementById("resetScoresBtn").addEventListener("click", resetScores);
  document.getElementById("reshuffleBtn").addEventListener("click", resetUsedChallenges);
  document.querySelector(".btn-double-yes").addEventListener("click", acceptDouble);
  document.querySelector(".btn-double-no").addEventListener("click", declineDouble);
  document.getElementById("timerStartBtn").addEventListener("click", startTimer);
  document.getElementById("timerPauseBtn").addEventListener("click", pauseTimer);
  document.getElementById("timerResetBtn").addEventListener("click", resetTimer);
  document.getElementById("revealBtn").addEventListener("click", revealAnswer);
  document.getElementById("revealBonusBtn").addEventListener("click", revealBonus);
  document.querySelector(".btn-correct").addEventListener("click", () => markCorrect("full"));
  document.querySelector(".btn-correct-help").addEventListener("click", () => markCorrect("help"));
  document.getElementById("bonusCorrectBtn").addEventListener("click", markBonusCorrect);
  document.querySelector(".btn-wrong").addEventListener("click", markWrong);
  document.querySelector(".btn-new-challenge").addEventListener("click", newChallenge);
  initKeyboard({
    onNewChallenge: newChallenge,
    onCorrect: () => markCorrect("full"),
    onCorrectHelp: () => markCorrect("help"),
    onWrong: markWrong,
    onStartTimer: () => { if (!isTimerRunning()) startTimer(); },
  });
  setTimerTickCallback(() => emitState(buildSnapshot()));
}
```

- [ ] **Step 4: Update `init()` — remove settings-related calls**

Replace the `init()` function with:

```js
function init() {
  wireEvents();
  applyRoundDifficulty("medium"); updateScoreButtonLabels(); resetTimer();
  updateScoreboardUI();
  clearChallengeArea(); updateNewChallengeButton();
  addToLog("Ready! Easy +4/40s · Medium +5/50s · Hard +6/60s (with help: −1).");
  addToLog("All modes have Bonus (+3 pts). Get 3 right in a row → Double or Nothing! 🎲");
  connectAsHost().then((code) => {
    document.getElementById("roomCodeDisplay").textContent = code;
    document.getElementById("roomCodeBadge").hidden = false;
    addToLog("Room created: " + code + " — students can join at /spectator.html");
  }).catch(() => {
    addToLog("⚠ Could not connect to WebSocket server. Spectator mode unavailable.");
  });
}
```

(Removed: `updateModeButtons()`, `updatePlayerListEmpty(1)`, `updatePlayerListEmpty(2)`, `updateTeamTurnDisplay()` — these now happen in lobby.js.)

- [ ] **Step 5: Replace the bottom auto-call with lobby + inGamePanel init**

Find the last line of the file:
```js
init(); // módulo é deferred — DOM já está parseado (substitui window.onload)
```

Replace it with:
```js
// Lobby runs on load; calls init() after teacher clicks Start Game
initLobby(() => init());
initInGamePanel();
```

- [ ] **Step 6: Run existing tests**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday && npm test
```

Expected: all 26 tests pass.

- [ ] **Step 7: Verify build**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday && npm run build 2>&1 | tail -10
```

Expected: no errors. If there are "not found" errors for IDs (e.g. from removed modal elements), check `wireEvents()` for any remaining references to removed elements.

- [ ] **Step 8: Commit**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday
git add src/main.js
git commit -m "refactor: main.js uses lobby + inGamePanel, removes settings modal wiring"
```

---

## Task 7: Delete `src/ui/settings.js`

**Files:**
- Delete: `src/ui/settings.js`

- [ ] **Step 1: Confirm no remaining imports of settings.js**

```bash
grep -r "settings.js" /home/andre/Projetos/pessoal/english-tuesday/src/
```

Expected: no output (no file imports settings.js anymore).

- [ ] **Step 2: Delete the file**

```bash
rm /home/andre/Projetos/pessoal/english-tuesday/src/ui/settings.js
```

- [ ] **Step 3: Run tests and build**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday && npm test && npm run build 2>&1 | tail -5
```

Expected: all 26 tests pass, build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday
git add -A
git commit -m "chore: delete settings.js — functionality migrated to lobby.js and inGamePanel.js"
```

---

## Task 8: Manual integration test

This task verifies the end-to-end experience. No automated tests cover DOM flows.

- [ ] **Step 1: Start the server and Vite**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday/server && node index.js &
cd /home/andre/Projetos/pessoal/english-tuesday && npm run dev
```

- [ ] **Step 2: Open the game**

Open `http://localhost:5173` in a browser. Expected: lobby screen appears (game view hidden). The lobby shows mode buttons, team inputs, player add rows, effects checkboxes, and "▶ Start Game" button.

- [ ] **Step 3: Configure in the lobby**

- Select a mode (e.g. "Name 3 Things") — verify button turns green
- Change Team 1 name to "Stars"
- Add player "Alice" to Team 1
- Click "▶ Start Game"

Expected: lobby disappears, game view appears. Header shows "Stars" as team 1. Room code badge appears. Log shows "Room created: XXXX".

- [ ] **Step 4: Test ⚙ in-game panel**

Click the ⚙ button. Expected: dark overlay with panel appears showing Reset scores, Reshuffle, sound/confetti toggles.

- [ ] **Step 5: Test in-game panel actions**

- Uncheck "Sounds" → click New Challenge → start timer → no tick sound (confirms gameState.soundEnabled = false)
- Click "Reset scores" → log shows "Score reset."
- Click outside the panel → panel closes

- [ ] **Step 6: Test game flow**

Click "New Challenge" → challenge appears in the selected mode. Timer starts. Correct/Wrong updates scoreboard.

- [ ] **Step 7: Commit empty (record that test passed)**

```bash
cd /home/andre/Projetos/pessoal/english-tuesday
git commit --allow-empty -m "chore: manual integration test passed for lobby + in-game panel"
```

---

## Self-Review

### Spec coverage

| Spec requirement | Covered by |
|---|---|
| Lobby is full-screen, replaces Settings modal | Task 1 (HTML), Task 2 (CSS) |
| Lobby sections: mode, team names, players, effects | Task 1 HTML + Task 4 lobby.js |
| "Start Game" writes to gameState then shows game | Task 4 lobby.js `onStart` callback |
| ⚙ button opens in-game panel (not old modal) | Task 5 inGamePanel.js + Task 6 main.js |
| In-game panel: reset scores, reshuffle, effects | Task 1 HTML (inGamePanel div) + Task 5 |
| Old Settings modal removed | Task 1 (HTML) + Task 3 (CSS) + Task 7 (settings.js) |
| All existing tests still pass | Tasks 3, 6, 7 each run `npm test` |
| `src/core/`, `src/modes/`, `src/data/` untouched | Zero references in any task |

### Placeholder scan

No TBDs, no "implement later", all code blocks are complete.

### Type/name consistency

- `initLobby(onStart)` defined in Task 4, called in Task 6 main.js ✓
- `initInGamePanel()` defined in Task 5, called in Task 6 main.js ✓
- `#lobbySoundEnabled`, `#lobbyConfettiEnabled` in Task 1 HTML, read in Task 4 lobby.js ✓
- `#igSoundEnabled`, `#igConfettiEnabled` in Task 1 HTML, wired in Task 5 inGamePanel.js ✓
- `#resetScoresBtn`, `#reshuffleBtn` in Task 1 HTML (inGamePanel), wired in Task 6 wireEvents() ✓
- `#randomModeBtn`, `.mode-btn` same IDs/classes in lobby HTML and lobby.js ✓
- `#team1list`, `#team2list`, `#team1empty`, `#team2empty` same IDs used by scoreboard.js ✓
