# WebSocket Spectator Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time spectator view so students can follow the English Tuesday game live on their phones while the teacher controls everything from the projector.

**Architecture:** A Node.js + Socket.io server handles room creation and state broadcasting; the existing Vite frontend gains a second entry point (`spectator.html`) for the student view. The host page connects as host on load, emits a snapshot of `gameState` after every action, and displays the room code for students to enter. No game logic moves to the server.

**Tech Stack:** Node.js 20+, socket.io 4.x (server + client), Vite multi-page build, Railway or Render for server deploy, Netlify for frontend (already configured).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `server/package.json` | Create | Server dependencies (socket.io) |
| `server/index.js` | Create | Room management + state relay |
| `src/socket.js` | Create | Socket.io client singleton (host + spectator) |
| `spectator.html` | Create | Spectator entry HTML (project root, mobile layout) |
| `src/spectator.js` | Create | Spectator page logic (join room, render state) |
| `src/ui/spectatorView.js` | Create | Renders a state snapshot to spectator DOM |
| `styles/spectator.css` | Create | Mobile-first spectator styles |
| `src/core/state.js` | Modify | Add `timerSecondsLeft` and `currentSpec` fields |
| `src/ui/timer.js` | Modify | Write `timeLeft` into `gameState.timerSecondsLeft` each tick |
| `src/main.js` | Modify | `buildSnapshot()`, `emitState()` calls, room code UI |
| `index.html` | Modify | Add room code badge element |
| `vite.config.js` | Modify | Add `spectator.html` as second build entry |
| `.gitignore` | Modify | Add `.env.local` |
| `.env.local` | Create (gitignored) | `VITE_WS_URL=ws://localhost:3001` for local dev |

---

## Task 1: Server — Node.js + Socket.io

**Files:**
- Create: `server/package.json`
- Create: `server/index.js`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "english-tuesday-server",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "socket.io": "^4.8.1"
  }
}
```

- [ ] **Step 2: Create `server/index.js`**

```js
import { createServer } from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3001;
const ROOM_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

// rooms: Map<code, { hostId: string|null, lastActivity: number, snapshot: object|null }>
const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

// Remove rooms inactive for more than ROOM_TTL_MS
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > ROOM_TTL_MS) rooms.delete(code);
  }
}, 60 * 60 * 1000);

io.on('connection', (socket) => {
  socket.on('create-room', () => {
    let code;
    do { code = generateCode(); } while (rooms.has(code));
    rooms.set(code, { hostId: socket.id, lastActivity: Date.now(), snapshot: null });
    socket.join(code);
    socket.data.role = 'host';
    socket.data.roomCode = code;
    socket.emit('room-created', code);
  });

  socket.on('join-room', (code) => {
    const room = rooms.get(code);
    if (!room) { socket.emit('error', 'Room not found. Check the code and try again.'); return; }
    socket.join(code);
    socket.data.role = 'spectator';
    socket.data.roomCode = code;
    room.lastActivity = Date.now();
    // Send current snapshot so new spectator is immediately in sync
    socket.emit('room-joined', room.snapshot);
  });

  socket.on('state-update', (data) => {
    const { role, roomCode } = socket.data;
    if (role !== 'host') return;
    const room = rooms.get(roomCode);
    if (!room || room.hostId !== socket.id) return;
    room.snapshot = data;
    room.lastActivity = Date.now();
    socket.to(roomCode).emit('state', data);
  });

  socket.on('disconnect', () => {
    const { role, roomCode } = socket.data ?? {};
    if (role === 'host' && roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        room.hostId = null;
        // Notify spectators that host is offline
        io.to(roomCode).emit('state', { ...(room.snapshot ?? {}), hostOffline: true });
      }
    }
  });
});

httpServer.listen(PORT, () => console.log(`english-tuesday server on port ${PORT}`));
```

- [ ] **Step 3: Install server dependencies**

```bash
cd server && npm install
```

- [ ] **Step 4: Verify server starts**

```bash
cd server && node index.js
```

Expected output: `english-tuesday server on port 3001`

Press Ctrl+C to stop.

- [ ] **Step 5: Commit**

```bash
git add server/
git commit -m "feat: add Socket.io server with room management"
```

---

## Task 2: Environment + Vite multi-page config

**Files:**
- Modify: `vite.config.js`
- Modify: `.gitignore`
- Create: `.env.local`
- Create: `spectator.html` (empty shell — content added in Task 6)

- [ ] **Step 1: Add `.env.local` to `.gitignore`**

Open `.gitignore` and append:

```
.env.local
```

- [ ] **Step 2: Create `.env.local` for local development**

```
VITE_WS_URL=ws://localhost:3001
```

- [ ] **Step 3: Update `vite.config.js` for multi-page + env**

Replace the entire file with:

```js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        spectator: resolve(__dirname, 'spectator.html'),
      },
    },
  },
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 4: Create empty `spectator.html` placeholder so Vite doesn't error**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Spectator</title>
</head>
<body>
  <p>Coming soon</p>
</body>
</html>
```

- [ ] **Step 5: Verify Vite still builds**

```bash
npm run build
```

Expected: build succeeds, `dist/` contains `index.html` and `spectator.html`.

- [ ] **Step 6: Commit**

```bash
git add vite.config.js .gitignore .env.local spectator.html
git commit -m "feat: vite multi-page config + local env for WS URL"
```

---

## Task 3: Socket.io client singleton (`src/socket.js`)

**Files:**
- Create: `src/socket.js`

- [ ] **Step 1: Install socket.io-client in the frontend**

```bash
npm install socket.io-client
```

- [ ] **Step 2: Create `src/socket.js`**

```js
import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

let _socket = null;

function getSocket() {
  if (!_socket) _socket = io(WS_URL, { autoConnect: false });
  return _socket;
}

/** Host: create a new room. Resolves with the room code. */
export function connectAsHost() {
  return new Promise((resolve) => {
    const s = getSocket();
    s.once('room-created', (code) => resolve(code));
    s.connect();
    s.emit('create-room');
  });
}

/** Spectator: join an existing room with `code`. */
export function connectAsSpectator(code) {
  const s = getSocket();
  s.connect();
  s.emit('join-room', code.toUpperCase().trim());
}

/** Host: push current game state to all spectators. */
export function emitState(snapshot) {
  getSocket().emit('state-update', snapshot);
}

/** Register a callback for when the spectator successfully joins (receives initial snapshot). */
export function onRoomJoined(cb) { getSocket().on('room-joined', cb); }

/** Register a callback for incoming state broadcasts (spectator side). */
export function onState(cb) { getSocket().on('state', cb); }

/** Register a callback for server errors (e.g. room not found). */
export function onSocketError(cb) { getSocket().on('error', cb); }
```

- [ ] **Step 3: Verify no import errors by running the dev server briefly**

```bash
npm run dev
```

Open `http://localhost:5173` in a browser. No console errors about socket. Press Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/socket.js package.json package-lock.json
git commit -m "feat: socket.io client singleton (host + spectator)"
```

---

## Task 4: Add `timerSecondsLeft` and `currentSpec` to `gameState`

**Files:**
- Modify: `src/core/state.js`
- Modify: `src/ui/timer.js`

These two new fields let `buildSnapshot()` in the next task read live timer state and the current challenge spec without accessing module-private variables.

- [ ] **Step 1: Add fields to `createInitialState()` in `src/core/state.js`**

In `src/core/state.js`, in `createInitialState()`, add two lines after `currentAnswer: "", currentAnswerLabel: "answer",`:

```js
    currentSpec: null,
    timerSecondsLeft: 0,
```

The full `createInitialState` return value becomes:

```js
function createInitialState() {
  return {
    score1: 0, score2: 0,
    team1name: "Blue Team", team2name: "Red Team",
    activeTeam: 1, turnTeam: 1,
    currentMode: 0, isRandom: true,
    timerDuration: 50,
    soundEnabled: true, confettiEnabled: true,
    roundLocked: false,
    playerTurnIndex: { 1: 0, 2: 0 },
    currentAnsweringPlayer: "",
    currentDifficulty: "medium",
    roundPointsFull: 5, roundPointsHelp: 4,
    consecutiveCorrect: { 1: 0, 2: 0 },
    doubleActive: false, doubleTeam: 0, doubleWaiting: false,
    bonusRevealed: false, bonusAnswer: "",
    currentAnswer: "", currentAnswerLabel: "answer",
    currentSpec: null,
    timerSecondsLeft: 0,
    usedPools: {},
  };
}
```

- [ ] **Step 2: Write `gameState.timerSecondsLeft` on every timer tick in `src/ui/timer.js`**

In `startTimer()`, inside the `setInterval` callback, add `gameState.timerSecondsLeft = timeLeft;` right after `timeLeft--;`:

```js
export function startTimer(){
  if(timerInterval)clearInterval(timerInterval);
  timeLeft=gameState.timerDuration;document.getElementById("timer").textContent=gameState.timerDuration;updateTimerRing();
  gameState.timerSecondsLeft = timeLeft;
  timerInterval=setInterval(()=>{
    timeLeft--;
    gameState.timerSecondsLeft = timeLeft;
    document.getElementById("timer").textContent=timeLeft;updateTimerRing();
    if(timeLeft>0&&timeLeft<=5)playSound("tick");
    if(timeLeft<=0){clearInterval(timerInterval);timerInterval=null;playSound("timeup");addToLog("⏰ Time's up!");}
  },1000);
}
```

Also update `resetTimer` to sync the field:

```js
export function resetTimer(){
  pauseTimer();
  timeLeft=gameState.timerDuration;
  gameState.timerSecondsLeft = timeLeft;
  document.getElementById("timer").textContent=gameState.timerDuration;
  updateTimerRing();
}
```

- [ ] **Step 3: Run existing tests to make sure nothing broke**

```bash
npm test
```

Expected: all 26 tests pass (state.js change is additive — `resetGameState` uses `Object.assign` so new fields are included automatically).

- [ ] **Step 4: Commit**

```bash
git add src/core/state.js src/ui/timer.js
git commit -m "feat: add timerSecondsLeft + currentSpec to gameState"
```

---

## Task 5: Host integration in `src/main.js` + room code badge in `index.html`

**Files:**
- Modify: `src/main.js`
- Modify: `index.html`

- [ ] **Step 1: Add room code badge element to `index.html`**

In `index.html`, right after `<button type="button" class="settings-fab" ...>`, add:

```html
<div id="roomCodeBadge" class="room-code-badge" hidden>
  Room: <span id="roomCodeDisplay">----</span>
</div>
```

- [ ] **Step 2: Add socket imports to `src/main.js`**

At the top of `src/main.js`, after the last existing import, add:

```js
import { connectAsHost, emitState } from "./socket.js";
```

- [ ] **Step 3: Add `buildSnapshot()` function to `src/main.js`**

Add this function near the top of `src/main.js` (after the imports block, before `resetUsedChallenges`):

```js
// ═══════════════════════════════════════════════════════
//  WEBSOCKET — STATE SNAPSHOT
// ═══════════════════════════════════════════════════════
function buildSnapshot() {
  return {
    score1: gameState.score1,
    score2: gameState.score2,
    team1name: gameState.team1name,
    team2name: gameState.team2name,
    activeTeam: gameState.activeTeam,
    modeTitle: gameState.isRandom
      ? "Random Challenge"
      : (modes[gameState.currentMode]?.title ?? ""),
    spec: gameState.currentSpec,
    currentDifficulty: gameState.currentDifficulty,
    roundPointsFull: gameState.roundPointsFull,
    currentAnsweringPlayer: gameState.currentAnsweringPlayer,
    timerRunning: isTimerRunning(),
    timerSecondsLeft: gameState.timerSecondsLeft,
    roundLocked: gameState.roundLocked,
    doubleActive: gameState.doubleActive,
    doubleTeam: gameState.doubleTeam,
    hostOffline: false,
  };
}
```

- [ ] **Step 4: Store `spec` in `gameState.currentSpec` inside `newChallenge()`**

In `newChallenge()`, right after `const spec = mode.render(item);`, add:

```js
gameState.currentSpec = spec;
```

- [ ] **Step 5: Call `emitState()` at the end of each state-changing function**

Add `emitState(buildSnapshot());` as the last line of each of these functions:

- `newChallenge()` — add before `updateNewChallengeButton();` at the very end:
  ```js
  emitState(buildSnapshot());
  ```

- `markCorrect(kind)` — add after `setRoundLocked(true);pauseTimer();` (before the bonus block):
  ```js
  emitState(buildSnapshot());
  ```

- `markWrong()` — add after `setRoundLocked(true);pauseTimer();` (before the bonus block):
  ```js
  emitState(buildSnapshot());
  ```

- `resetScores()` — add as the last line:
  ```js
  emitState(buildSnapshot());
  ```

Also in `src/ui/timer.js`, `startTimer`'s interval callback already writes `gameState.timerSecondsLeft` — but we need to emit on each tick. Since `timer.js` can't import `main.js` (circular), add a timer tick callback instead. In `src/ui/timer.js`, export a setter:

```js
let _onTick = null;
export function setTimerTickCallback(fn) { _onTick = fn; }
```

In the `setInterval` body of `startTimer`, call it:

```js
timerInterval=setInterval(()=>{
  timeLeft--;
  gameState.timerSecondsLeft = timeLeft;
  document.getElementById("timer").textContent=timeLeft;updateTimerRing();
  if(_onTick) _onTick();
  if(timeLeft>0&&timeLeft<=5)playSound("tick");
  if(timeLeft<=0){clearInterval(timerInterval);timerInterval=null;playSound("timeup");addToLog("⏰ Time's up!");}
},1000);
```

Then in `src/main.js`, import `setTimerTickCallback` and wire it in `wireEvents()`:

Add to the import from `./ui/timer.js`:
```js
import {
  syncTimerToDuration, updateTimerStartLabel, startTimer, pauseTimer, resetTimer,
  isTimerRunning, setTimerTickCallback,
} from "./ui/timer.js";
```

Add at the end of `wireEvents()`:
```js
setTimerTickCallback(() => emitState(buildSnapshot()));
```

- [ ] **Step 6: Connect as host on init and show room code**

At the end of `init()`, add:

```js
connectAsHost().then((code) => {
  const badge = document.getElementById("roomCodeBadge");
  document.getElementById("roomCodeDisplay").textContent = code;
  badge.hidden = false;
  addToLog("Room created: " + code + " — students can join at /spectator");
});
```

- [ ] **Step 7: Run existing tests**

```bash
npm test
```

Expected: all 26 tests pass (socket import doesn't affect core tests).

- [ ] **Step 8: Commit**

```bash
git add src/main.js src/ui/timer.js index.html
git commit -m "feat: host emits game state over WebSocket + room code badge"
```

---

## Task 6: Spectator view — HTML, CSS, JS

**Files:**
- Modify: `spectator.html` (replace placeholder)
- Create: `styles/spectator.css`
- Create: `src/ui/spectatorView.js`
- Create: `src/spectator.js`

- [ ] **Step 1: Replace `spectator.html` with full content**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>English Tuesday — Spectator</title>
  <link rel="stylesheet" href="./styles/base.css">
  <link rel="stylesheet" href="./styles/spectator.css">
</head>
<body>
  <!-- Join screen (shown before entering a room) -->
  <div id="joinScreen" class="join-screen">
    <h1 class="join-title">English Tuesday</h1>
    <p class="join-subtitle">Team Battle!</p>
    <label class="join-label" for="codeInput">Enter room code</label>
    <input
      id="codeInput"
      class="join-input"
      type="text"
      maxlength="4"
      placeholder="F7KQ"
      autocomplete="off"
      autocapitalize="characters"
      spellcheck="false"
    >
    <button id="joinBtn" class="join-btn">Join</button>
    <p id="joinError" class="join-error" hidden></p>
  </div>

  <!-- Game screen (shown after joining) -->
  <div id="gameScreen" class="game-screen" hidden>
    <div id="noHostBanner" class="no-host-banner" hidden>
      ⏳ Waiting for teacher to reconnect…
    </div>

    <!-- Scores -->
    <div class="sp-scores">
      <div class="sp-score sp-score--blue">
        <div class="sp-team-name" id="spTeam1Name">Blue Team</div>
        <div class="sp-score-value" id="spScore1">0</div>
      </div>
      <div class="sp-score sp-score--red">
        <div class="sp-team-name" id="spTeam2Name">Red Team</div>
        <div class="sp-score-value" id="spScore2">0</div>
      </div>
    </div>

    <!-- Active team + mode -->
    <div class="sp-meta">
      <span id="spActiveTeam" class="sp-active-team"></span>
      <span id="spModeTitle" class="sp-mode-title"></span>
    </div>

    <!-- Timer -->
    <div class="sp-timer" id="spTimer">--</div>

    <!-- Challenge content -->
    <div class="sp-challenge" id="spChallenge">
      <div id="spPrompt" class="sp-prompt"></div>
      <div id="spOptions" class="sp-options"></div>
    </div>
  </div>

  <script type="module" src="./src/spectator.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `styles/spectator.css`**

```css
/* ─── Spectator page — mobile-first dark layout ─── */

body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 1rem;
  background: var(--bg, #0f1117);
  color: var(--text, #e8eaf0);
  font-family: var(--font-sans, system-ui, sans-serif);
}

/* ── Join screen ── */
.join-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  max-width: 320px;
}

.join-title {
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0;
}

.join-subtitle {
  margin: 0;
  opacity: 0.6;
  font-size: 1rem;
}

.join-label {
  font-size: 0.9rem;
  opacity: 0.7;
  margin-top: 1rem;
}

.join-input {
  width: 100%;
  padding: 0.8rem;
  font-size: 2rem;
  text-align: center;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  background: #1e2130;
  border: 2px solid #3a3f55;
  border-radius: 0.5rem;
  color: inherit;
  outline: none;
}

.join-input:focus { border-color: var(--team1, #4f8ef7); }

.join-btn {
  width: 100%;
  padding: 0.9rem;
  font-size: 1.1rem;
  font-weight: 600;
  background: var(--team1, #4f8ef7);
  border: none;
  border-radius: 0.5rem;
  color: #fff;
  cursor: pointer;
}

.join-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.join-error {
  color: var(--accent-red, #e05252);
  font-size: 0.9rem;
  text-align: center;
  margin: 0;
}

/* ── Game screen ── */
.game-screen {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.no-host-banner {
  background: #2a2010;
  border: 1px solid #665522;
  border-radius: 0.5rem;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  text-align: center;
  color: #ccaa44;
}

/* Scores */
.sp-scores {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.sp-score {
  border-radius: 0.75rem;
  padding: 0.75rem;
  text-align: center;
  background: #1e2130;
}

.sp-score--blue { border-top: 3px solid var(--team1, #4f8ef7); }
.sp-score--red  { border-top: 3px solid var(--accent-red, #e05252); }

.sp-team-name {
  font-size: 0.8rem;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sp-score-value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.1;
}

/* Meta */
.sp-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  opacity: 0.7;
}

/* Timer */
.sp-timer {
  font-size: 3.5rem;
  font-weight: 700;
  text-align: center;
  letter-spacing: -0.02em;
}

.sp-timer.urgent { color: var(--accent-red, #e05252); }

/* Challenge */
.sp-challenge {
  background: #1e2130;
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sp-prompt {
  font-size: 1.2rem;
  line-height: 1.5;
}

.sp-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.spectator-option {
  padding: 0.7rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #3a3f55;
  background: #252a3a;
  color: inherit;
  font-size: 1rem;
  text-align: left;
  cursor: default;
}
```

- [ ] **Step 3: Create `src/ui/spectatorView.js`**

```js
/**
 * Renders a game state snapshot into the spectator DOM.
 * @param {object} state — snapshot from buildSnapshot() in main.js
 */
export function renderSpectatorState(state) {
  // No-host banner
  document.getElementById('noHostBanner').hidden = !state.hostOffline;

  // Scores
  document.getElementById('spTeam1Name').textContent = state.team1name ?? 'Blue Team';
  document.getElementById('spTeam2Name').textContent = state.team2name ?? 'Red Team';
  document.getElementById('spScore1').textContent = state.score1 ?? 0;
  document.getElementById('spScore2').textContent = state.score2 ?? 0;

  // Active team + mode
  const activeTeamName = state.activeTeam === 1
    ? (state.team1name ?? 'Blue Team')
    : (state.team2name ?? 'Red Team');
  document.getElementById('spActiveTeam').textContent = '▶ ' + activeTeamName;
  document.getElementById('spModeTitle').textContent = state.modeTitle ?? '';

  // Timer
  const timerEl = document.getElementById('spTimer');
  const secs = state.timerSecondsLeft ?? 0;
  timerEl.textContent = secs > 0 ? secs + 's' : '--';
  timerEl.classList.toggle('urgent', secs > 0 && secs <= 10);

  // Challenge prompt + options
  if (state.spec) {
    document.getElementById('spPrompt').innerHTML = state.spec.promptHtml ?? '';
    const optionsEl = document.getElementById('spOptions');
    optionsEl.innerHTML = '';
    if (Array.isArray(state.spec.options)) {
      state.spec.options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'spectator-option';
        btn.textContent = opt;
        btn.disabled = true; // spectators cannot interact
        optionsEl.appendChild(btn);
      });
    }
  }
}
```

- [ ] **Step 4: Create `src/spectator.js`**

```js
import { connectAsSpectator, onRoomJoined, onState, onSocketError } from './socket.js';
import { renderSpectatorState } from './ui/spectatorView.js';

const codeInput  = document.getElementById('codeInput');
const joinBtn    = document.getElementById('joinBtn');
const joinError  = document.getElementById('joinError');
const joinScreen = document.getElementById('joinScreen');
const gameScreen = document.getElementById('gameScreen');

joinBtn.addEventListener('click', join);
codeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });

function join() {
  const code = codeInput.value.trim().toUpperCase();
  if (code.length !== 4) {
    showError('Please enter a 4-character room code.');
    return;
  }
  joinBtn.disabled = true;
  joinBtn.textContent = 'Joining…';
  connectAsSpectator(code);
}

onRoomJoined((snapshot) => {
  joinScreen.hidden = true;
  gameScreen.hidden = false;
  if (snapshot) renderSpectatorState(snapshot);
});

onState((snapshot) => {
  renderSpectatorState(snapshot);
});

onSocketError((msg) => {
  joinBtn.disabled = false;
  joinBtn.textContent = 'Join';
  showError(msg);
});

function showError(msg) {
  joinError.textContent = msg;
  joinError.hidden = false;
}
```

- [ ] **Step 5: Verify build includes spectator page**

```bash
npm run build
```

Expected: `dist/spectator.html` exists, no build errors.

- [ ] **Step 6: Commit**

```bash
git add spectator.html styles/spectator.css src/spectator.js src/ui/spectatorView.js
git commit -m "feat: spectator page — join screen + live game view"
```

---

## Task 7: Local integration test

This task is manual — no automated tests for the socket layer.

- [ ] **Step 1: Start the server**

```bash
cd server && node index.js
```

Expected: `english-tuesday server on port 3001`

- [ ] **Step 2: Start Vite in a second terminal**

```bash
npm run dev
```

Expected: Vite dev server on `http://localhost:5173`

- [ ] **Step 3: Open host view**

Open `http://localhost:5173` in a browser tab. Expected: game loads normally, a "Room: XXXX" badge appears in the top area with a 4-character code.

- [ ] **Step 4: Open spectator view**

Open `http://localhost:5173/spectator.html` in a second browser tab (or phone on same network). Expected: join screen appears.

- [ ] **Step 5: Join with the room code**

Type the 4-character code from the host badge into the spectator join field and click Join. Expected: join screen hides, game screen appears showing current scores (0–0) and "Waiting for teacher…" if no challenge yet.

- [ ] **Step 6: Trigger a new challenge on the host**

Click "New Challenge" in the host tab. Expected: spectator tab updates within ~1 second to show the challenge prompt.

- [ ] **Step 7: Test timer sync**

Click Start Timer on the host. Expected: spectator timer counts down in sync (within 1 second accuracy).

- [ ] **Step 8: Test correct/wrong**

Click Correct or Wrong on the host. Expected: spectator scores update immediately.

- [ ] **Step 9: Test host disconnect**

Close the host tab. Expected: spectator shows "Waiting for teacher to reconnect…" banner.

- [ ] **Step 10: Commit integration notes (no code change needed if all passes)**

```bash
git commit --allow-empty -m "chore: local integration test passed for WebSocket spectator mode"
```

---

## Task 8: Deploy config

**Files:**
- Create: `server/railway.json` (Railway deploy config)
- Update: `README.md` section on deploy (brief)

- [ ] **Step 1: Create `server/railway.json`**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node index.js",
    "healthcheckPath": "/",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

- [ ] **Step 2: Verify `server/package.json` has a `start` script**

It was created in Task 1 with `"start": "node index.js"` — confirm it's there. No change needed.

- [ ] **Step 3: Document the Netlify env var**

In the Netlify dashboard for the frontend:
- Go to Site Settings → Environment variables
- Add: `VITE_WS_URL` = `wss://<your-railway-app>.railway.app`

(This is a manual step in the Netlify UI — no file to edit.)

- [ ] **Step 4: Commit**

```bash
git add server/railway.json
git commit -m "chore: add Railway deploy config for Socket.io server"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Room code (4-char) creation by host | Task 1 server + Task 5 init() |
| Spectator joins with code | Task 1 `join-room` + Task 6 spectator.js |
| State broadcast on every host action | Task 5 `emitState()` calls |
| Spectator sees: challenge, scores, timer, active team | Task 6 spectatorView.js |
| Host disconnect → "Waiting for teacher" banner | Task 1 disconnect handler + Task 6 HTML |
| New spectator receives current snapshot on join | Task 1 `room-joined` + `room.snapshot` |
| Room expiry after 4 hours | Task 1 `setInterval` cleanup |
| Cloud deploy (Railway) | Task 8 |
| Env var for WS URL | Task 2 `.env.local` + Netlify step |
| `src/core/` untouched by logic | All tasks — only `state.js` gets two new data fields |

**Placeholder scan:** No TBDs, no "implement later", all code blocks are complete.

**Type consistency:**
- `buildSnapshot()` → returns object matching shape in spec ✓
- `renderSpectatorState(state)` → reads same fields (`state.score1`, `state.spec.promptHtml`, etc.) ✓
- `emitState(snapshot)` → `snapshot` flows host → server → spectators ✓
- `setTimerTickCallback` defined in Task 4, imported in Task 5 ✓
