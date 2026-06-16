# Interactive Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Interativo" game mode where each student joins from `/play.html`, sees challenges in real-time, and submits answers; the server auto-scores when all active-team players answer or the timer expires.

**Architecture:** The lobby gains a play-mode radio (Projetor / Interativo). In Interativo mode, the teacher still controls pacing (New Challenge) but scoring is automatic via the server. Students use a new `/play.html` page; `server/index.js` gains player tracking and auto-score logic. `main.js` hides manual scoring buttons and wires new socket callbacks. All existing Projector-mode code remains untouched.

**Tech Stack:** Same stack as existing code — Vite ES modules, Socket.io 4.x (already installed), Vitest (existing tests, no new automated tests — all new features are DOM/socket-dependent).

**Prerequisite:** The "WebSocket Optional" plan (`2026-06-16-websocket-optional.md`) must be implemented first. This plan builds on `init(enableRoom)` and the `#lobbyEnableRoom` checkbox it introduces.

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Modify | `src/core/state.js` | add `playMode: "projector"` field |
| Modify | `src/ui/timer.js` | add `setTimerEndCallback` export |
| Modify | `server/index.js` | player tracking, challenge-start, submit-answer, timer-expired, resolveRound |
| Modify | `src/socket.js` | 9 new exports for interactive events |
| Create | `play.html` | student join + game page |
| Create | `styles/play.css` | mobile-first student page styles |
| Create | `src/ui/playerView.js` | renders challenge on student device |
| Create | `src/play.js` | student page entry point |
| Modify | `vite.config.js` | add play.html to rollup input |
| Modify | `index.html` | play-mode radio, players panel, answers panel |
| Modify | `src/ui/lobby.js` | read playMode, show/hide sections |
| Modify | `styles/lobby.css` | `.lobby-play-mode` styles |
| Modify | `styles/components.css` | `.players-panel`, `.answers-panel` styles |
| Modify | `src/main.js` | sanitizeSpec, emitChallenge, onRoundResult, hide scoring buttons in interactive |

---

### Task 1: Add playMode to gameState

**Files:**
- Modify: `src/core/state.js`

- [ ] **Step 1: Add playMode field**

Open `src/core/state.js`. In `createInitialState()`, add `playMode` after `usedPools`:

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
    playMode: "projector",   // "projector" | "interactive"
  };
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: 6 files, 26 tests, all pass.

- [ ] **Step 3: Commit**

```bash
git add src/core/state.js
git commit -m "feat: add playMode field to gameState"
```

---

### Task 2: Add setTimerEndCallback to timer.js

**Files:**
- Modify: `src/ui/timer.js`

- [ ] **Step 1: Add _onEnd variable and export**

Open `src/ui/timer.js`. Currently line 11–12:

```js
let _onTick = null;
export function setTimerTickCallback(fn) { _onTick = fn; }
```

Change to:

```js
let _onTick = null;
export function setTimerTickCallback(fn) { _onTick = fn; }
let _onEnd = null;
export function setTimerEndCallback(fn) { _onEnd = fn; }
```

- [ ] **Step 2: Fire _onEnd when timer reaches zero**

In `startTimer()`, find the `if(timeLeft<=0)` block inside `setInterval`. Current:

```js
if(timeLeft<=0){clearInterval(timerInterval);timerInterval=null;playSound("timeup");addToLog("⏰ Time's up!");}
```

Change to:

```js
if(timeLeft<=0){clearInterval(timerInterval);timerInterval=null;playSound("timeup");addToLog("⏰ Time's up!");if(_onEnd)_onEnd();}
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: 26 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/ui/timer.js
git commit -m "feat: add setTimerEndCallback to timer.js"
```

---

### Task 3: Extend server for interactive mode

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Extend room initialization in create-room**

Open `server/index.js`. Find the `create-room` handler:

```js
socket.on('create-room', () => {
  let code;
  do { code = generateCode(); } while (rooms.has(code));
  rooms.set(code, { hostId: socket.id, lastActivity: Date.now(), snapshot: null });
  socket.join(code);
  socket.data.role = 'host';
  socket.data.roomCode = code;
  socket.emit('room-created', code);
});
```

Replace with (adds interactive-mode fields):

```js
socket.on('create-room', () => {
  let code;
  do { code = generateCode(); } while (rooms.has(code));
  rooms.set(code, {
    hostId: socket.id,
    lastActivity: Date.now(),
    snapshot: null,
    // interactive mode fields
    players: {},           // { [socketId]: { name, team } }
    currentAnswer: null,
    activeTeam: null,
    roundPointsFull: 5,
    answers: {},           // { [socketId]: { name, answer, correct } }
    roundOpen: false,
  });
  socket.join(code);
  socket.data.role = 'host';
  socket.data.roomCode = code;
  socket.emit('room-created', code);
});
```

- [ ] **Step 2: Add resolveRound function**

Add this function before `io.on('connection', ...)`:

```js
function resolveRound(code) {
  const room = rooms.get(code);
  if (!room || !room.roundOpen) return;
  room.roundOpen = false;

  const activePlayers = Object.entries(room.players)
    .filter(([, p]) => p.team === room.activeTeam)
    .map(([sid]) => sid);

  const total = activePlayers.length || 1;
  const correctCount = activePlayers.filter((sid) => room.answers[sid]?.correct).length;
  const teamCorrect = correctCount >= total / 2;
  const delta = teamCorrect ? (room.roundPointsFull || 5) : 0;

  // Update snapshot scores for student display
  if (room.activeTeam === 1) room.snapshot = { ...(room.snapshot || {}), score1: (room.snapshot?.score1 || 0) + delta };
  else                        room.snapshot = { ...(room.snapshot || {}), score2: (room.snapshot?.score2 || 0) + delta };

  const teamAnswers = activePlayers.map((sid) => room.answers[sid] || {
    name: room.players[sid]?.name || 'unknown',
    answer: '(no answer)',
    correct: false,
  });

  io.to(code).emit('round-result', {
    activeTeam: room.activeTeam,
    correct: teamCorrect,
    delta,
    teamAnswers,
    score1: room.snapshot?.score1 || 0,
    score2: room.snapshot?.score2 || 0,
  });
}
```

- [ ] **Step 3: Add player-join handler**

Inside `io.on('connection', (socket) => { ... })`, add after the existing `join-room` handler:

```js
socket.on('player-join', ({ code, name, team }) => {
  if (typeof code !== 'string' || !/^[A-Z2-9]{4}$/.test(code)) {
    socket.emit('error', 'Invalid room code.'); return;
  }
  const room = rooms.get(code);
  if (!room) { socket.emit('error', 'Room not found. Check the code and try again.'); return; }
  if (typeof name !== 'string' || !name.trim() || name.length > 30) {
    socket.emit('error', 'Invalid name.'); return;
  }
  if (team !== 1 && team !== 2) { socket.emit('error', 'Invalid team.'); return; }

  socket.join(code);
  socket.data.role = 'player';
  socket.data.roomCode = code;
  room.players[socket.id] = { name: name.trim(), team };
  room.lastActivity = Date.now();

  // Confirm join to student + send current player list
  socket.emit('player-joined', {});
  socket.emit('player-list', Object.values(room.players));

  // Notify teacher of new player
  if (room.hostId) io.to(room.hostId).emit('player-joined', { name: name.trim(), team });
});
```

- [ ] **Step 4: Add challenge-start handler**

Add after `player-join` handler:

```js
socket.on('challenge-start', ({ spec, answer, activeTeam, team1name, team2name, roundPointsFull }) => {
  if (typeof spec !== 'object' || spec === null) return;
  if (typeof answer !== 'string') return;
  if (activeTeam !== 1 && activeTeam !== 2) return;
  const code = socket.data.roomCode;
  const room = rooms.get(code);
  if (!room || socket.id !== room.hostId) return;

  room.currentAnswer = answer.toLowerCase().trim();
  room.activeTeam = activeTeam;
  room.roundPointsFull = typeof roundPointsFull === 'number' ? roundPointsFull : 5;
  room.answers = {};
  room.roundOpen = true;
  room.lastActivity = Date.now();

  // Broadcast sanitized spec to all players (spec has no answer field — host already stripped it)
  Object.keys(room.players).forEach((sid) => {
    io.to(sid).emit('challenge', { spec, activeTeam, team1name, team2name });
  });
});
```

- [ ] **Step 5: Add submit-answer handler**

Add after `challenge-start` handler:

```js
socket.on('submit-answer', ({ answer }) => {
  if (typeof answer !== 'string') return;
  const code = socket.data.roomCode;
  const room = rooms.get(code);
  if (!room || !room.roundOpen) return;
  const player = room.players[socket.id];
  if (!player) return;
  if (player.team !== room.activeTeam) return;  // inactive team cannot answer
  if (room.answers[socket.id]) return;           // already answered this round

  const correct = answer.toLowerCase().trim() === room.currentAnswer;
  room.answers[socket.id] = { name: player.name, answer, correct };

  // Notify teacher in real-time
  if (room.hostId) io.to(room.hostId).emit('player-answered', { name: player.name, correct });

  // Auto-resolve if all active team players answered
  const activePlayers = Object.entries(room.players)
    .filter(([, p]) => p.team === room.activeTeam)
    .map(([sid]) => sid);
  if (activePlayers.length > 0 && activePlayers.every((sid) => room.answers[sid])) {
    resolveRound(code);
  }
});
```

- [ ] **Step 6: Add timer-expired handler**

Add after `submit-answer` handler:

```js
socket.on('timer-expired', () => {
  const code = socket.data.roomCode;
  const room = rooms.get(code);
  if (!room || socket.id !== room.hostId || !room.roundOpen) return;
  resolveRound(code);
});
```

- [ ] **Step 7: Update disconnect handler to clean up players**

Find the existing `disconnect` handler:

```js
socket.on('disconnect', () => {
  const { role, roomCode } = socket.data ?? {};
  if (role === 'host' && roomCode) {
    const room = rooms.get(roomCode);
    if (room) {
      room.hostId = null;
      io.to(roomCode).emit('state', { ...(room.snapshot ?? {}), hostOffline: true });
    }
  }
});
```

Replace with:

```js
socket.on('disconnect', () => {
  const { role, roomCode } = socket.data ?? {};
  if (!roomCode) return;
  const room = rooms.get(roomCode);
  if (!room) return;

  if (role === 'host') {
    room.hostId = null;
    io.to(roomCode).emit('state', { ...(room.snapshot ?? {}), hostOffline: true });
  } else if (role === 'player') {
    delete room.players[socket.id];
    delete room.answers[socket.id];
    // If a round is open, check if all remaining active players have answered
    if (room.roundOpen) {
      const activePlayers = Object.entries(room.players)
        .filter(([, p]) => p.team === room.activeTeam)
        .map(([sid]) => sid);
      if (activePlayers.length === 0 || activePlayers.every((sid) => room.answers[sid])) {
        resolveRound(roomCode);
      }
    }
  }
});
```

- [ ] **Step 8: Manual test — start server and verify**

```bash
cd server && node index.js
```

Expected: `english-tuesday server on port 3001` with no errors.

Stop with Ctrl+C.

- [ ] **Step 9: Commit**

```bash
cd server
git add index.js
cd ..
git commit -m "feat: server interactive mode — player-join, challenge-start, submit-answer, resolveRound"
```

---

### Task 4: New socket.js exports for interactive mode

**Files:**
- Modify: `src/socket.js`

- [ ] **Step 1: Add all new exports**

Open `src/socket.js`. Append the following after the last existing export (`onSocketError`):

```js
/** Interactive: student joins a room with name and team (1=Blue, 2=Red). */
export function connectAsPlayer(code, name, team) {
  const s = getSocket();
  s.connect();
  s.emit('player-join', { code: code.toUpperCase().trim(), name, team });
}

/** Interactive: student submits their answer for the current round. */
export function submitAnswer(answer) {
  getSocket().emit('submit-answer', { answer });
}

/**
 * Interactive: host broadcasts challenge to students.
 * payload: { spec (sanitized, no answer), answer, activeTeam, team1name, team2name, roundPointsFull }
 */
export function emitChallenge(payload) {
  getSocket().emit('challenge-start', payload);
}

/** Interactive: host signals the timer hit zero so server resolves the round. */
export function emitTimerExpired() {
  getSocket().emit('timer-expired');
}

/** Interactive: student receives a new challenge from the host. */
export function onChallenge(cb) {
  const s = getSocket();
  s.off('challenge');
  s.on('challenge', cb);
}

/** Interactive: teacher is notified that a student confirmed their answer. */
export function onPlayerAnswered(cb) {
  const s = getSocket();
  s.off('player-answered');
  s.on('player-answered', cb);
}

/** Interactive: all clients receive the round result after auto-scoring. */
export function onRoundResult(cb) {
  const s = getSocket();
  s.off('round-result');
  s.on('round-result', cb);
}

/** Interactive: teacher and student are notified a new player joined. */
export function onPlayerJoined(cb) {
  const s = getSocket();
  s.off('player-joined');
  s.on('player-joined', cb);
}

/** Interactive: new student receives the current player list on join. */
export function onPlayerList(cb) {
  const s = getSocket();
  s.off('player-list');
  s.on('player-list', cb);
}
```

- [ ] **Step 2: Run tests and build**

```bash
npm test && npm run build
```

Expected: 26 tests pass, build succeeds (socket.js is not imported by any test, only tree-shaken).

- [ ] **Step 3: Commit**

```bash
git add src/socket.js
git commit -m "feat: socket.js interactive mode exports"
```

---

### Task 5: Student page — play.html and styles/play.css

**Files:**
- Create: `play.html` (project root, next to `index.html`)
- Create: `styles/play.css`

- [ ] **Step 1: Create play.html**

Create `/home/andre/Projetos/pessoal/english-tuesday/play.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <title>English Tuesday — Join</title>
  <link rel="stylesheet" href="./styles/base.css">
  <link rel="stylesheet" href="./styles/play.css">
</head>
<body>
  <div id="joinScreen">
    <h1>🎮 English Tuesday</h1>
    <p class="play-subtitle">Enter your room code to join</p>
    <input type="text" id="codeInput" placeholder="Room code (e.g. ABCD)" maxlength="4" autocomplete="off" autocapitalize="characters">
    <input type="text" id="nameInput" placeholder="Your name" maxlength="30" autocomplete="off">
    <div id="teamSelect">
      <button type="button" id="teamBlueBtn" class="team-btn team-btn--blue">🔵 Blue Team</button>
      <button type="button" id="teamRedBtn"  class="team-btn team-btn--red">🔴 Red Team</button>
    </div>
    <button type="button" id="joinBtn">Join</button>
    <p id="joinError" hidden></p>
  </div>

  <div id="gameScreen" hidden>
    <header id="playHeader">
      <span id="playTeamBadge" class="play-team-badge"></span>
      <span id="playScore" class="play-score"></span>
    </header>
    <div id="challengeArea"></div>
    <div id="waitingMsg" hidden>
      <p id="waitingText" class="play-waiting-text"></p>
    </div>
    <div id="resultArea" hidden>
      <p id="resultMsg" class="play-result-msg"></p>
      <ul id="resultList" class="play-result-list"></ul>
    </div>
  </div>

  <script type="module" src="./src/play.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create styles/play.css**

Create `/home/andre/Projetos/pessoal/english-tuesday/styles/play.css`:

```css
/* play.css — student device layout, mobile-first */

body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  padding: 1rem;
  box-sizing: border-box;
}

/* ── Join screen ── */
#joinScreen {
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: .75rem;
}

#joinScreen h1 {
  text-align: center;
  font-size: 1.5rem;
  margin: 0 0 .25rem;
}

.play-subtitle {
  text-align: center;
  color: var(--text-muted);
  font-size: .9rem;
  margin: 0;
}

#joinScreen input {
  font-size: 1.1rem;
  padding: .65rem .85rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text);
  width: 100%;
  box-sizing: border-box;
}

#teamSelect {
  display: flex;
  gap: .5rem;
}

.team-btn {
  flex: 1;
  padding: .8rem;
  border-radius: 8px;
  font-size: 1rem;
  border: 2px solid transparent;
  background: var(--bg-panel);
  color: var(--text);
  cursor: pointer;
  transition: border-color .15s, background .15s;
}

.team-btn--blue.active {
  border-color: var(--team1);
  background: color-mix(in srgb, var(--team1) 20%, var(--bg-panel));
}

.team-btn--red.active {
  border-color: var(--accent-red);
  background: color-mix(in srgb, var(--accent-red) 20%, var(--bg-panel));
}

#joinBtn {
  padding: .8rem;
  font-size: 1.1rem;
  border-radius: 8px;
  background: var(--accent-green);
  color: #000;
  border: none;
  cursor: pointer;
  font-weight: 700;
}

#joinBtn:disabled { opacity: .5; cursor: default; }

#joinError {
  color: var(--accent-red);
  font-size: .9rem;
  text-align: center;
  margin: 0;
}

/* ── Game screen ── */
#gameScreen {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

#playHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1rem;
  font-weight: 700;
  padding: .5rem 0;
  border-bottom: 1px solid var(--border);
}

.play-team-badge { font-size: 1rem; }
.play-score { color: var(--text-muted); }

/* Challenge area elements */
.play-prompt {
  font-size: 1.2rem;
  line-height: 1.5;
  margin: 0 0 .75rem;
}

.play-emoji {
  font-size: 2.5rem;
  text-align: center;
  margin: .5rem 0;
}

.play-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: .5rem;
}

.play-option-btn {
  padding: .9rem .5rem;
  font-size: 1rem;
  border-radius: 8px;
  border: 2px solid var(--border);
  background: var(--bg-panel);
  color: var(--text);
  cursor: pointer;
  transition: border-color .15s, background .15s;
}

.play-option-btn.selected {
  border-color: var(--accent-green);
  background: color-mix(in srgb, var(--accent-green) 20%, var(--bg-panel));
}

.play-option-btn:disabled { opacity: .65; cursor: default; }

.play-answer-row {
  display: flex;
  gap: .5rem;
}

.play-answer-input {
  flex: 1;
  font-size: 1rem;
  padding: .65rem .85rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text);
}

.play-submit-btn {
  padding: .65rem 1rem;
  font-size: 1rem;
  border-radius: 8px;
  background: var(--accent-green);
  color: #000;
  border: none;
  cursor: pointer;
  font-weight: 700;
}

.play-submit-btn:disabled { opacity: .5; cursor: default; }

/* Waiting + result */
.play-waiting-text {
  text-align: center;
  color: var(--text-muted);
  font-size: 1.1rem;
  padding: 2rem 0;
  margin: 0;
}

#resultArea {
  padding: 1rem;
  border-radius: 8px;
  background: var(--bg-panel);
}

.play-result-msg {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 .75rem;
}

.play-result-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: .3rem;
  font-size: .95rem;
}
```

- [ ] **Step 3: Verify files exist**

```bash
ls play.html styles/play.css
```

Expected: both files listed.

- [ ] **Step 4: Commit**

```bash
git add play.html styles/play.css
git commit -m "feat: play.html and styles/play.css — student join/game page"
```

---

### Task 6: Create src/ui/playerView.js

**Files:**
- Create: `src/ui/playerView.js`

- [ ] **Step 1: Create the file**

Create `/home/andre/Projetos/pessoal/english-tuesday/src/ui/playerView.js`:

```js
/**
 * Renders challenges and results on the student's device (/play.html).
 * No scoring buttons — students select/submit answers only.
 */

/**
 * Render a challenge spec into #challengeArea.
 * @param {object} spec - sanitized RenderSpec (no answer field)
 * @param {(answer: string) => void} onSubmit - called when student confirms answer
 */
export function renderPlayerChallenge(spec, onSubmit) {
  const area = document.getElementById('challengeArea');
  area.innerHTML = '';

  // Prompt text
  if (spec.promptHtml) {
    const p = document.createElement('p');
    p.className = 'play-prompt';
    p.innerHTML = spec.promptHtml;
    area.appendChild(p);
  }

  // Emoji (emoji mode)
  if (spec.emojiHtml) {
    const em = document.createElement('div');
    em.className = 'play-emoji';
    em.innerHTML = spec.emojiHtml;
    area.appendChild(em);
  }

  // Multiple-choice options (sentence, oddOne, etc.)
  if (spec.options?.length) {
    const grid = document.createElement('div');
    grid.className = 'play-options';
    spec.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'play-option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        // Highlight selection and lock all buttons
        grid.querySelectorAll('.play-option-btn').forEach((b) => {
          b.classList.remove('selected');
          b.disabled = true;
        });
        btn.classList.add('selected');
        onSubmit(opt);
      });
      grid.appendChild(btn);
    });
    area.appendChild(grid);
    return;
  }

  // Free-text answer (name3, rhyme, describe, translation)
  const row = document.createElement('div');
  row.className = 'play-answer-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'play-answer-input';
  input.placeholder = 'Your answer…';
  input.autocomplete = 'off';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'play-submit-btn';
  btn.textContent = '✓ Confirm';

  const submit = () => {
    if (!input.value.trim()) return;
    input.disabled = true;
    btn.disabled = true;
    onSubmit(input.value.trim());
  };

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });

  row.appendChild(input);
  row.appendChild(btn);
  area.appendChild(row);
}

/**
 * Show the "waiting for other team" message.
 * @param {number} activeTeam - 1 or 2
 * @param {string} team1name
 * @param {string} team2name
 */
export function renderWaiting(activeTeam, team1name, team2name) {
  const name = activeTeam === 1 ? team1name : team2name;
  document.getElementById('waitingMsg').hidden = false;
  document.getElementById('waitingText').textContent = `${name}'s turn — stand by…`;
}

/**
 * Render the round result (shown to all students after auto-score).
 * @param {{ correct: boolean, delta: number, teamAnswers: Array<{name,answer,correct}> }} result
 */
export function renderResult(result) {
  document.getElementById('resultMsg').textContent =
    result.correct ? `✅ +${result.delta} pts!` : `❌ No points this round.`;

  const list = document.getElementById('resultList');
  list.innerHTML = '';
  result.teamAnswers.forEach(({ name, answer, correct }) => {
    const li = document.createElement('li');
    li.textContent = `${correct ? '✅' : '❌'} ${name} — "${answer}"`;
    list.appendChild(li);
  });

  document.getElementById('resultArea').hidden = false;
}

/**
 * Update the score display in the game screen header.
 * @param {number} score1
 * @param {number} score2
 */
export function updatePlayScore(score1, score2) {
  document.getElementById('playScore').textContent = `🔵 ${score1}  vs  🔴 ${score2}`;
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: 26 tests pass (playerView.js is DOM-only, not imported by tests).

- [ ] **Step 3: Commit**

```bash
git add src/ui/playerView.js
git commit -m "feat: playerView.js — renders challenges and results on student device"
```

---

### Task 7: Create src/play.js — student page entry point

**Files:**
- Create: `src/play.js`

- [ ] **Step 1: Create the file**

Create `/home/andre/Projetos/pessoal/english-tuesday/src/play.js`:

```js
import {
  connectAsPlayer, onChallenge, onRoundResult, onSocketError, onPlayerJoined,
  submitAnswer,
} from './socket.js';
import {
  renderPlayerChallenge, renderWaiting, renderResult, updatePlayScore,
} from './ui/playerView.js';

let myTeam = null;
let selectedTeam = null;

// ── Team selection ──
document.getElementById('teamBlueBtn').addEventListener('click', () => selectTeam(1));
document.getElementById('teamRedBtn').addEventListener('click',  () => selectTeam(2));

function selectTeam(t) {
  selectedTeam = t;
  document.getElementById('teamBlueBtn').classList.toggle('active', t === 1);
  document.getElementById('teamRedBtn').classList.toggle('active',  t === 2);
}

// ── Join ──
document.getElementById('joinBtn').addEventListener('click', join);
document.getElementById('codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
document.getElementById('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });

function join() {
  const code = document.getElementById('codeInput').value.trim().toUpperCase();
  const name = document.getElementById('nameInput').value.trim();
  const err = document.getElementById('joinError');
  err.hidden = true;

  if (code.length !== 4) { showError('Enter a 4-character room code.'); return; }
  if (!name)             { showError('Enter your name.'); return; }
  if (!selectedTeam)     { showError('Choose a team: Blue or Red.'); return; }

  myTeam = selectedTeam;
  document.getElementById('joinBtn').disabled = true;
  connectAsPlayer(code, name, selectedTeam);
}

// ── Server events ──

onPlayerJoined(() => {
  // Server confirmed join — switch to game screen
  document.getElementById('joinScreen').hidden = true;
  const gs = document.getElementById('gameScreen');
  gs.hidden = false;
  document.getElementById('playTeamBadge').textContent =
    myTeam === 1 ? '🔵 Blue Team' : '🔴 Red Team';
});

onChallenge((payload) => {
  // payload: { spec, activeTeam, team1name, team2name }
  document.getElementById('resultArea').hidden = true;
  document.getElementById('waitingMsg').hidden = true;
  document.getElementById('challengeArea').innerHTML = '';

  if (payload.activeTeam === myTeam) {
    renderPlayerChallenge(payload.spec, (answer) => submitAnswer(answer));
  } else {
    renderWaiting(payload.activeTeam, payload.team1name, payload.team2name);
  }
});

onRoundResult((result) => {
  document.getElementById('challengeArea').innerHTML = '';
  document.getElementById('waitingMsg').hidden = true;
  renderResult(result);
  updatePlayScore(result.score1, result.score2);
});

onSocketError((msg) => {
  document.getElementById('joinBtn').disabled = false;
  showError(msg);
});

function showError(msg) {
  const el = document.getElementById('joinError');
  el.textContent = msg;
  el.hidden = false;
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: 26 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/play.js
git commit -m "feat: play.js — student page entry point"
```

---

### Task 8: Add play.html to Vite build

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Read current vite.config.js**

Open `vite.config.js`. It should look like:

```js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main:      resolve(__dirname, 'index.html'),
        spectator: resolve(__dirname, 'spectator.html'),
      },
    },
  },
  test: { environment: 'node' },
});
```

- [ ] **Step 2: Add play.html entry**

Change the `input` object to:

```js
input: {
  main:      resolve(__dirname, 'index.html'),
  spectator: resolve(__dirname, 'spectator.html'),
  play:      resolve(__dirname, 'play.html'),
},
```

- [ ] **Step 3: Verify build includes play.html**

```bash
npm run build 2>&1 | grep play
```

Expected output includes something like: `play.html` or `assets/play-...js`.

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: 26 tests pass.

- [ ] **Step 5: Commit**

```bash
git add vite.config.js
git commit -m "feat: add play.html to Vite build"
```

---

### Task 9: Update index.html — play-mode radio and panels

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add play-mode radio as first lobby section**

Open `index.html`. Find the start of `.lobby-inner` (after `<div class="lobby-inner">`). The first child is currently `<h1 class="lobby-title">`. Insert a new section **after** the `<p class="lobby-subtitle">` tag and **before** the `<section>` for Game Mode:

```html
<section class="lobby-section">
  <h2 class="lobby-section-title">Como vamos jogar?</h2>
  <div class="lobby-play-mode">
    <label>
      <input type="radio" name="playMode" id="modeProjector" value="projector" checked>
      <span>Projetor — professor apresenta, alunos assistem</span>
    </label>
    <label>
      <input type="radio" name="playMode" id="modeInteractive" value="interactive">
      <span>Interativo — cada aluno responde no dispositivo</span>
    </label>
  </div>
</section>
```

- [ ] **Step 2: Wrap both lobby-add-row divs with a class for toggling**

In the Teams section, each team div has a `.lobby-add-row`. These should be hidden when Interativo is selected. They already have class `lobby-add-row` — no change needed to HTML; lobby.js will hide them via class query.

- [ ] **Step 3: Add players panel to .app header**

Find `<header class="app-header">`. After the closing `</div>` of `.header-scoreboard`, add:

```html
<div id="playersPanel" class="players-panel" hidden>
  <div id="playersPanelTeam1" class="players-panel-team players-panel-team--blue"></div>
  <div id="playersPanelTeam2" class="players-panel-team players-panel-team--red"></div>
</div>
```

- [ ] **Step 4: Add answers panel inside #challengePanel**

Find `<section class="challenge-panel challenge-panel--idle" id="challengePanel">`. After the `<div class="challenge-body">...</div>` block (before `<div id="awaitingScoreNote">`), add:

```html
<div id="answersPanel" class="answers-panel" hidden>
  <ul id="answersList" class="answers-list"></ul>
</div>
```

- [ ] **Step 5: Run tests and build**

```bash
npm test && npm run build
```

Expected: 26 tests pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat: index.html — play-mode radio, players panel, answers panel"
```

---

### Task 10: Update src/ui/lobby.js — playMode logic

**Files:**
- Modify: `src/ui/lobby.js`

- [ ] **Step 1: Replace initLobby with full new version**

Open `src/ui/lobby.js`. Replace the entire file with:

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
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: 26 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/ui/lobby.js
git commit -m "feat: lobby.js — playMode radio, show/hide sections by mode"
```

---

### Task 11: CSS — play-mode radio and teacher panels

**Files:**
- Modify: `styles/lobby.css`
- Modify: `styles/components.css`

- [ ] **Step 1: Add .lobby-play-mode styles to lobby.css**

Open `styles/lobby.css`. Append at the end:

```css
/* ── Play mode selector ── */
.lobby-play-mode {
  display: flex;
  flex-direction: column;
  gap: .4rem;
}

.lobby-play-mode label {
  display: flex;
  align-items: center;
  gap: .6rem;
  padding: .55rem .75rem;
  border-radius: 8px;
  border: 2px solid var(--border);
  cursor: pointer;
  transition: border-color .15s, background .15s;
}

.lobby-play-mode label:has(input:checked) {
  border-color: var(--accent-green);
  background: color-mix(in srgb, var(--accent-green) 10%, var(--bg-panel));
}

.lobby-play-mode input[type="radio"] {
  accent-color: var(--accent-green);
}
```

- [ ] **Step 2: Add .players-panel and .answers-panel to components.css**

Open `styles/components.css`. Append at the end:

```css
/* ── Interactive mode — teacher panels ── */
.players-panel {
  display: flex;
  gap: 1rem;
  padding: .4rem .75rem;
  background: var(--bg-panel);
  border-radius: 8px;
  font-size: .82rem;
  flex-wrap: wrap;
}

.players-panel-team {
  display: flex;
  flex-wrap: wrap;
  gap: .3rem;
  align-items: center;
}

.players-panel-team--blue::before { content: "🔵"; margin-right: .2rem; }
.players-panel-team--red::before  { content: "🔴"; margin-right: .2rem; }

.player-badge {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: .15rem .4rem;
  font-size: .8rem;
}

.answers-panel {
  padding: .5rem .75rem;
  background: var(--bg-panel);
  border-radius: 8px;
  font-size: .85rem;
  margin-top: .5rem;
}

.answers-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: .2rem;
}
```

- [ ] **Step 3: Run build to catch any CSS syntax errors**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add styles/lobby.css styles/components.css
git commit -m "feat: CSS for play-mode radio and interactive teacher panels"
```

---

### Task 12: main.js — interactive mode integration

**Files:**
- Modify: `src/main.js`

This task wires everything together on the teacher side.

- [ ] **Step 1: Add new imports**

Open `src/main.js`. Find the import block. The `socket.js` import currently reads:

```js
import { connectAsHost, emitState } from "./socket.js";
```

Change to:

```js
import {
  connectAsHost, emitState,
  emitChallenge, emitTimerExpired,
  onRoundResult, onPlayerAnswered, onPlayerJoined,
} from "./socket.js";
```

Find the `timer.js` import:

```js
import {
  syncTimerToDuration, updateTimerStartLabel, startTimer, pauseTimer, resetTimer, isTimerRunning,
  setTimerTickCallback,
} from "./ui/timer.js";
```

Change to:

```js
import {
  syncTimerToDuration, updateTimerStartLabel, startTimer, pauseTimer, resetTimer, isTimerRunning,
  setTimerTickCallback, setTimerEndCallback,
} from "./ui/timer.js";
```

- [ ] **Step 2: Add sanitizeSpec helper**

Add this function near the top of the file, after the imports and before `buildSnapshot()`:

```js
// ═══════════════════════════════════════════════════════
//  INTERACTIVE MODE HELPERS
// ═══════════════════════════════════════════════════════
/** Returns a copy of spec with answer fields removed — safe to send to students. */
function sanitizeSpec(spec) {
  const s = { ...spec };
  delete s.answer;
  if (s.bonus) s.bonus = { ...s.bonus, answer: undefined };
  return s;
}
```

- [ ] **Step 3: Update newChallenge() to broadcast challenge in interactive mode**

Find `newChallenge()`. After the `renderChallenge(spec, ...)` call and after `applyRoundDifficulty(item.difficulty)`, add:

```js
  if (gameState.playMode === "interactive") {
    emitChallenge({
      spec: sanitizeSpec(spec),
      answer: spec.answer || "",
      activeTeam: gameState.turnTeam,
      team1name: gameState.team1name,
      team2name: gameState.team2name,
      roundPointsFull: gameState.roundPointsFull,
    });
    // Hide answers panel from previous round
    document.getElementById("answersPanel").hidden = true;
  }
```

Also in `newChallenge()`, find `assignAnsweringPlayer(gameState.turnTeam)` and wrap it:

```js
  if (gameState.playMode !== "interactive") {
    assignAnsweringPlayer(gameState.turnTeam);
  }
```

- [ ] **Step 4: Add initInteractiveMode() function**

Add this new function after `resetScores()`:

```js
/** Wire interactive-mode-specific teacher callbacks. Called from init() when playMode=interactive. */
function initInteractiveMode() {
  // Hide manual scoring buttons — scoring is automatic
  [".btn-correct", ".btn-correct-help", ".btn-wrong", "#bonusCorrectBtn"].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.hidden = true;
  });

  // Show players panel
  document.getElementById("playersPanel").hidden = false;

  // Receive new player joining
  onPlayerJoined(({ name, team }) => {
    if (!name) return; // student's own confirmation has empty payload — skip
    const panelEl = document.getElementById(team === 1 ? "playersPanelTeam1" : "playersPanelTeam2");
    const badge = document.createElement("span");
    badge.className = "player-badge";
    badge.textContent = name;
    badge.dataset.playerName = name;
    panelEl.appendChild(badge);
  });

  // Real-time answer confirmation — mark player as answered
  onPlayerAnswered(({ name }) => {
    const badge = document.querySelector(`[data-player-name="${CSS.escape(name)}"]`);
    if (badge && !badge.textContent.endsWith(" ✓")) badge.textContent = name + " ✓";
  });

  // Auto-score when server resolves the round
  onRoundResult((result) => {
    // Apply points to gameState (same as markCorrect/markWrong but automatic)
    if (result.delta > 0) addPoint(result.activeTeam, result.delta);

    // Log result
    const teamName = result.activeTeam === 1 ? gameState.team1name : gameState.team2name;
    if (result.correct) {
      addToLog(`✅ Auto-score: ${teamName} +${result.delta} pts`);
      launchConfetti();
    } else {
      addToLog(`❌ Auto-score: ${teamName} — no points this round`);
    }

    // Show answers panel
    const list = document.getElementById("answersList");
    list.innerHTML = "";
    result.teamAnswers.forEach(({ name, answer, correct }) => {
      const li = document.createElement("li");
      li.textContent = `${correct ? "✅" : "❌"} ${name} — "${answer}"`;
      list.appendChild(li);
    });
    document.getElementById("answersPanel").hidden = false;

    // Reset player ✓ badges for next round
    document.querySelectorAll(".player-badge").forEach((b) => {
      b.textContent = b.dataset.playerName;
    });

    emitState(buildSnapshot());
  });

  // When timer reaches 0, tell server to resolve the round
  setTimerEndCallback(() => emitTimerExpired());
}
```

- [ ] **Step 5: Call initInteractiveMode() from init()**

Find the `init(enableRoom = false)` function. After `wireEvents();`, add:

```js
  if (gameState.playMode === "interactive") initInteractiveMode();
```

The full updated `init` function:

```js
function init(enableRoom = false) {
  wireEvents();
  if (gameState.playMode === "interactive") initInteractiveMode();
  applyRoundDifficulty("medium"); updateScoreButtonLabels(); resetTimer();
  updateScoreboardUI();
  clearChallengeArea(); updateNewChallengeButton();
  addToLog("Ready! Easy +4/40s · Medium +5/50s · Hard +6/60s (with help: −1).");
  addToLog("All modes have Bonus (+3 pts). Get 3 right in a row → Double or Nothing! 🎲");
  if (enableRoom) {
    connectAsHost().then((code) => {
      document.getElementById("roomCodeDisplay").textContent = code;
      document.getElementById("roomCodeBadge").hidden = false;
      addToLog("Room created: " + code + " — students can join at /play.html");
    }).catch(() => {
      addToLog("⚠ Could not connect to WebSocket server. Spectator mode unavailable.");
    });
  }
}
```

- [ ] **Step 6: Run tests and build**

```bash
npm test && npm run build
```

Expected: 26 tests pass, build produces `dist/` including `play.html`.

- [ ] **Step 7: Commit**

```bash
git add src/main.js
git commit -m "feat: main.js interactive mode — sanitizeSpec, emitChallenge, initInteractiveMode"
```

---

### Task 13: End-to-end manual test

- [ ] **Step 1: Start the server**

```bash
cd server && node index.js
```

Expected: `english-tuesday server on port 3001`

- [ ] **Step 2: Start the dev server**

In another terminal:

```bash
npm run dev
```

Expected: Vite dev server at `http://localhost:5173`

- [ ] **Step 3: Test Projector mode (offline)**

Open `http://localhost:5173`. Select **Projetor** radio. Leave "Criar sala" unchecked. Click Start.
Expected: game appears, NO network requests to `localhost:3001` in DevTools.

- [ ] **Step 4: Test Projector mode (with room)**

Reload. Select **Projetor**, check "Criar sala". Click Start.
Expected: room code appears in header. Open `http://localhost:5173/spectator.html`, enter code → spectator view syncs.

- [ ] **Step 5: Test Interactive mode — teacher joins**

Reload. Select **Interativo**. Fill team names → Start.
Expected: room code appears, "add player" rows hidden in lobby, scoring buttons (Correct/Wrong) hidden in game.

- [ ] **Step 6: Test Interactive mode — students join**

Open `http://localhost:5173/play.html` in two tabs.
- Tab 1: enter room code, name "Alice", Blue Team → Join → game screen appears
- Tab 2: enter same code, name "Bob", Blue Team → Join
Expected: teacher's players panel shows "Alice" and "Bob" in Blue section.

- [ ] **Step 7: Test round flow**

Teacher clicks **New Challenge**.
Expected:
- Alice and Bob tabs show the challenge (if Blue Team's turn) or "Red Team's turn…"
- Teacher sees challenge panel with mode title

Submit answers on student tabs.
Expected:
- After each submission, teacher sees "Alice ✓" appear in players panel
- After both submit, round auto-scores, answers panel shows who answered what
- Score updates on both teacher and student screens

- [ ] **Step 8: Test timer-expiry path**

Teacher clicks New Challenge. Do NOT submit on student tabs. Let timer count to 0.
Expected: round auto-scores with 0 points (no one answered), answers panel shows "(no answer)" for each.

- [ ] **Step 9: Final commit tag**

```bash
git tag interactive-mode-v1
```
