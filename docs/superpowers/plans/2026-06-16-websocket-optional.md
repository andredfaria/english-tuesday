# WebSocket Optional — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the WebSocket connection opt-in via a lobby checkbox so the game runs without network errors when no server is running.

**Architecture:** Add a "Criar sala para espectadores" checkbox to the lobby Effects section. `lobby.js` reads it and passes a boolean to `onStart(enableRoom)`. `main.js` receives `enableRoom` in `init(enableRoom)` and only calls `connectAsHost()` if true. When false, the room code badge stays hidden and no polling errors occur.

**Tech Stack:** Vanilla JS ES modules, Vite. No new dependencies.

---

## File Map

- Modify: `index.html` — add `#lobbyEnableRoom` checkbox inside `.settings-row` in the Effects section
- Modify: `src/ui/lobby.js` — read checkbox, pass `enableRoom` boolean to `onStart`
- Modify: `src/main.js` — accept `enableRoom` arg in `init()`, wrap `connectAsHost()` call in `if (enableRoom)`

---

### Task 1: Add checkbox to index.html and update lobby.js

**Files:**
- Modify: `index.html` (Effects section, lines ~64–68)
- Modify: `src/ui/lobby.js` (startGameBtn click handler, line ~69)

- [ ] **Step 1: Add the checkbox to index.html**

Open `index.html`. Find the Effects `<div class="settings-row">` block (currently contains `#lobbySoundEnabled` and `#lobbyConfettiEnabled`). Add a third label **inside** that same `div`:

```html
<section class="lobby-section">
  <h2 class="lobby-section-title">Effects</h2>
  <div class="settings-row">
    <label><input type="checkbox" id="lobbySoundEnabled" checked> Sounds</label>
    <label><input type="checkbox" id="lobbyConfettiEnabled" checked> Confetti on correct</label>
    <label id="lobbyEnableRoomLabel"><input type="checkbox" id="lobbyEnableRoom"> Criar sala para espectadores (WebSocket)</label>
  </div>
</section>
```

Default unchecked (no `checked` attribute) so teachers playing locally see no errors by default.

- [ ] **Step 2: Update lobby.js startGameBtn handler**

Open `src/ui/lobby.js`. The current `startGameBtn` click handler ends with `onStart()`. Change it to read the checkbox and pass the boolean:

```js
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

    const enableRoom = document.getElementById("lobbyEnableRoom").checked;
    onStart(enableRoom);
  });
```

- [ ] **Step 3: Verify tests still pass**

```bash
npm test
```

Expected: 6 files, 26 tests, all pass.

- [ ] **Step 4: Commit**

```bash
git add index.html src/ui/lobby.js
git commit -m "feat: add optional WebSocket room checkbox to lobby"
```

---

### Task 2: Update main.js to conditionally connect WebSocket

**Files:**
- Modify: `src/main.js` — `init()` function (~line 306) and `initLobby` call (~line 323)

- [ ] **Step 1: Change initLobby call to pass enableRoom**

Open `src/main.js`. Find the bottom of the file (last 3 lines):

```js
// Lobby runs on load; calls init() after teacher clicks Start Game
initLobby(() => init());
initInGamePanel();
```

Change to:

```js
// Lobby runs on load; calls init(enableRoom) after teacher clicks Start Game
initLobby((enableRoom) => init(enableRoom));
initInGamePanel();
```

- [ ] **Step 2: Update init() to accept and use enableRoom**

Find the `init()` function definition. Current:

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

Replace with:

```js
function init(enableRoom = false) {
  wireEvents();
  applyRoundDifficulty("medium"); updateScoreButtonLabels(); resetTimer();
  updateScoreboardUI();
  clearChallengeArea(); updateNewChallengeButton();
  addToLog("Ready! Easy +4/40s · Medium +5/50s · Hard +6/60s (with help: −1).");
  addToLog("All modes have Bonus (+3 pts). Get 3 right in a row → Double or Nothing! 🎲");
  if (enableRoom) {
    connectAsHost().then((code) => {
      document.getElementById("roomCodeDisplay").textContent = code;
      document.getElementById("roomCodeBadge").hidden = false;
      addToLog("Room created: " + code + " — students can join at /spectator.html");
    }).catch(() => {
      addToLog("⚠ Could not connect to WebSocket server. Spectator mode unavailable.");
    });
  }
}
```

- [ ] **Step 3: Verify tests still pass and build succeeds**

```bash
npm test && npm run build
```

Expected: 26 tests pass, build produces `dist/` with no errors.

- [ ] **Step 4: Manual smoke test**

Run `npm run dev`. Open `http://localhost:5173`.
- Leave "Criar sala" **unchecked** → click Start Game → open DevTools Network tab → confirm NO requests to `localhost:3001`.
- Refresh, check the box → Start Game → confirm a request to `localhost:3001` is attempted (will fail if server not running, but the error is only in the log, not console polling).

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat: init() accepts enableRoom flag, skips connectAsHost() when false"
```
