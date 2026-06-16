# Design: Interactive Mode (Cada Aluno no Seu Dispositivo)

**Date:** 2026-06-16
**Status:** Approved

## Summary

Add an "Interactive" game mode where each student joins from their own device (`/play.html`), sees challenges in real-time, and submits answers. The active team's students answer; when all have submitted OR the timer expires, the server auto-scores (≥50% correct → team gets `roundPointsFull` points). The teacher still controls pacing via "New Challenge" but no longer manually scores. The existing Projector mode is untouched.

## Flow

```
SETUP
─────
1. Teacher opens lobby → selects "Interativo"
2. Fills team names, effects → clicks "Start Game"
3. WebSocket room created → 4-char code shown in header
4. Students open /play.html → enter code + name + choose team → join
5. Teacher sees student names appear in "Players" panel in real-time

EACH ROUND
──────────
1. Teacher clicks "New Challenge"
   → main.js picks challenge, calls emitChallenge(spec, answer, activeTeam)
   → server stores answer + activeTeam, broadcasts sanitized spec (no answer) to students
2. Active team students: see challenge + options/input → submit answer
   Inactive team students: see "Red Team's turn…" + timer countdown
3. Server receives each answer:
   → compares to stored correct answer (case-insensitive trim)
   → emits player-answered to teacher (shows ✓ per player in real-time)
   → when ALL active team players answered → resolveRound()
4. If timer expires before all answered → teacher emits timer-expired → resolveRound()
5. resolveRound():
   → count correct / total for activeTeam
   → correct = (correct_count >= total/2)
   → delta = correct ? gameState.roundPointsFull : 0
   → emits round-result to ALL clients: { teamAnswers, correct, delta, activeTeam, score1, score2 }
6. Teacher screen: auto-updates score, shows who answered what
   Student screen: shows result + everyone's answers → awaits next challenge
```

## Lobby Changes

### Mode selector (top of lobby, before Game Mode section)

```html
<section class="lobby-section">
  <h2 class="lobby-section-title">Como vamos jogar?</h2>
  <div class="lobby-play-mode">
    <label>
      <input type="radio" name="playMode" value="projector" checked>
      <span>Projetor — professor apresenta, alunos assistem</span>
    </label>
    <label>
      <input type="radio" name="playMode" value="interactive">
      <span>Interativo — cada aluno responde no dispositivo</span>
    </label>
  </div>
</section>
```

When "Interativo" is selected:
- WebSocket room is always created on Start (no "Criar sala" checkbox needed)
- The "Criar sala para espectadores" checkbox (from the WebSocket-optional spec) is hidden
- Team names section is shown as normal (students self-assign to teams on join)
- The "Add players" rows in the lobby are hidden (players join from their devices)

When "Projetor" is selected: existing behavior unchanged.

`gameState.playMode = "projector" | "interactive"` — new field in `state.js`.

## File Changes

### New files

**`/play.html`**

Student page. Screens:
1. Join screen: room code input, name input, team selector (Blue/Red), Join button, error display
2. Game screen (hidden initially): team header, challenge area, answer area OR waiting message, timer, result display, score display

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
    <input type="text" id="codeInput" placeholder="Room code (e.g. ABCD)" maxlength="4">
    <input type="text" id="nameInput" placeholder="Your name">
    <div id="teamSelect">
      <button type="button" id="teamBlueBtn" class="team-btn team-btn--blue">🔵 Blue Team</button>
      <button type="button" id="teamRedBtn"  class="team-btn team-btn--red" >🔴 Red Team</button>
    </div>
    <button type="button" id="joinBtn">Join</button>
    <p id="joinError" hidden></p>
  </div>

  <div id="gameScreen" hidden>
    <header id="playHeader">
      <span id="playTeamBadge"></span>
      <span id="playScore"></span>
    </header>
    <div id="playTimer"></div>
    <div id="challengeArea">
      <!-- populated by playerView.js -->
    </div>
    <div id="waitingMsg" hidden>
      <p id="waitingText"></p>
    </div>
    <div id="resultArea" hidden>
      <p id="resultMsg"></p>
      <ul id="resultList"></ul>
    </div>
  </div>

  <script type="module" src="./src/play.js"></script>
</body>
</html>
```

**`src/play.js`**

Entry point for `/play.html`. Wires join form, delegates rendering to `playerView.js`.

```js
import { connectAsPlayer, onPlayerJoined, onChallenge, onPlayerAnswered, onRoundResult, onSocketError, submitAnswer, emitTimerExpired } from './socket.js';
import { renderPlayerChallenge, renderWaiting, renderResult, updatePlayScore } from './ui/playerView.js';

let myTeam = null;
let myName = null;
let selectedTeam = null;

// Team selection
document.getElementById('teamBlueBtn').addEventListener('click', () => selectTeam(1));
document.getElementById('teamRedBtn').addEventListener('click',  () => selectTeam(2));

function selectTeam(t) {
  selectedTeam = t;
  document.getElementById('teamBlueBtn').classList.toggle('active', t === 1);
  document.getElementById('teamRedBtn').classList.toggle('active',  t === 2);
}

// Join
document.getElementById('joinBtn').addEventListener('click', join);
document.getElementById('codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });

function join() {
  const code = document.getElementById('codeInput').value.trim().toUpperCase();
  const name = document.getElementById('nameInput').value.trim();
  if (code.length !== 4) { showError('Enter a 4-character room code.'); return; }
  if (!name)             { showError('Enter your name.'); return; }
  if (!selectedTeam)     { showError('Choose a team.'); return; }
  myName = name;
  myTeam = selectedTeam;
  document.getElementById('joinBtn').disabled = true;
  connectAsPlayer(code, name, selectedTeam);
}

onPlayerJoined(() => {
  document.getElementById('joinScreen').hidden = true;
  document.getElementById('gameScreen').hidden = false;
  document.getElementById('playTeamBadge').textContent = myTeam === 1 ? '🔵 Blue Team' : '🔴 Red Team';
});

onChallenge((payload) => {
  // payload: { spec, activeTeam, team1name, team2name }
  document.getElementById('resultArea').hidden = true;
  if (payload.activeTeam === myTeam) {
    document.getElementById('waitingMsg').hidden = true;
    renderPlayerChallenge(payload.spec, (answer) => submitAnswer(answer));
  } else {
    document.getElementById('challengeArea').innerHTML = '';
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

**`src/ui/playerView.js`**

Renders the challenge on the student's device. Mirrors `ui/challenge.js` logic but simplified (no scoring buttons, no timer ring — just the prompt/options/input).

```js
export function renderPlayerChallenge(spec, onSubmit) {
  const area = document.getElementById('challengeArea');
  area.innerHTML = '';

  // Prompt
  const p = document.createElement('p');
  p.className = 'play-prompt';
  p.innerHTML = spec.promptHtml || '';
  area.appendChild(p);

  // Emoji (if present)
  if (spec.emojiHtml) {
    const em = document.createElement('div');
    em.className = 'play-emoji';
    em.innerHTML = spec.emojiHtml;
    area.appendChild(em);
  }

  // Multiple choice options
  if (spec.options?.length) {
    const grid = document.createElement('div');
    grid.className = 'play-options';
    spec.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'play-option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        grid.querySelectorAll('.play-option-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        grid.querySelectorAll('.play-option-btn').forEach(b => b.disabled = true);
        onSubmit(opt);
      });
      grid.appendChild(btn);
    });
    area.appendChild(grid);
    return;
  }

  // Text answer (no options)
  const row = document.createElement('div');
  row.className = 'play-answer-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'play-answer-input';
  input.placeholder = 'Your answer…';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'play-submit-btn';
  btn.textContent = '✓ Confirm';
  btn.addEventListener('click', () => {
    if (!input.value.trim()) return;
    input.disabled = true;
    btn.disabled = true;
    onSubmit(input.value.trim());
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
  row.appendChild(input);
  row.appendChild(btn);
  area.appendChild(row);
}

export function renderWaiting(activeTeam, team1name, team2name) {
  document.getElementById('waitingMsg').hidden = false;
  const name = activeTeam === 1 ? team1name : team2name;
  document.getElementById('waitingText').textContent = `${name}'s turn — stand by…`;
}

export function renderResult(result) {
  const area = document.getElementById('resultArea');
  area.hidden = false;
  document.getElementById('resultMsg').textContent =
    result.correct ? `✅ +${result.delta} pts!` : `❌ No points this round.`;
  const list = document.getElementById('resultList');
  list.innerHTML = '';
  result.teamAnswers.forEach(({ name, answer, correct }) => {
    const li = document.createElement('li');
    li.textContent = `${correct ? '✅' : '❌'} ${name} — "${answer}"`;
    list.appendChild(li);
  });
}

export function updatePlayScore(score1, score2) {
  document.getElementById('playScore').textContent = `🔵 ${score1}  vs  🔴 ${score2}`;
}
```

**`styles/play.css`**

Mobile-first dark layout. Large touch targets.

```css
/* play.css — student device layout */
body { display: flex; flex-direction: column; align-items: center; justify-content: center;
       min-height: 100dvh; padding: 1rem; font-family: inherit; }

#joinScreen { width: 100%; max-width: 360px; display: flex; flex-direction: column; gap: .75rem; }
#joinScreen h1 { text-align: center; font-size: 1.4rem; margin-bottom: .5rem; }
#joinScreen input { font-size: 1.1rem; padding: .6rem .8rem; border-radius: 8px;
                    border: 1px solid var(--border); background: var(--bg-panel); color: var(--text); width: 100%; }
#teamSelect { display: flex; gap: .5rem; }
.team-btn { flex: 1; padding: .75rem; border-radius: 8px; font-size: 1rem; border: 2px solid transparent;
            background: var(--bg-panel); color: var(--text); cursor: pointer; }
.team-btn--blue.active { border-color: var(--team1); background: color-mix(in srgb, var(--team1) 20%, var(--bg-panel)); }
.team-btn--red.active  { border-color: var(--accent-red); background: color-mix(in srgb, var(--accent-red) 20%, var(--bg-panel)); }
#joinBtn { padding: .75rem; font-size: 1.1rem; border-radius: 8px; background: var(--accent-green);
           color: #000; border: none; cursor: pointer; font-weight: 700; }
#joinError { color: var(--accent-red); font-size: .9rem; }

#gameScreen { width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 1rem; }
#playHeader { display: flex; justify-content: space-between; font-size: 1rem; font-weight: 700; }

.play-prompt { font-size: 1.2rem; line-height: 1.5; }
.play-emoji  { font-size: 2rem; text-align: center; }

.play-options { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
.play-option-btn { padding: .9rem .5rem; font-size: 1rem; border-radius: 8px; border: 2px solid var(--border);
                   background: var(--bg-panel); color: var(--text); cursor: pointer; }
.play-option-btn.selected { border-color: var(--accent-green); background: color-mix(in srgb, var(--accent-green) 20%, var(--bg-panel)); }
.play-option-btn:disabled { opacity: .6; cursor: default; }

.play-answer-row { display: flex; gap: .5rem; }
.play-answer-input { flex: 1; font-size: 1rem; padding: .6rem .8rem; border-radius: 8px;
                     border: 1px solid var(--border); background: var(--bg-panel); color: var(--text); }
.play-submit-btn { padding: .6rem 1rem; font-size: 1rem; border-radius: 8px; background: var(--accent-green);
                   color: #000; border: none; cursor: pointer; font-weight: 700; }

#resultArea { padding: 1rem; border-radius: 8px; background: var(--bg-panel); }
#resultMsg { font-size: 1.2rem; font-weight: 700; margin-bottom: .5rem; }
#resultList { list-style: none; padding: 0; display: flex; flex-direction: column; gap: .25rem; }

#waitingMsg { text-align: center; color: var(--text-muted); font-size: 1rem; padding: 2rem; }
```

### Modified files

**`src/core/state.js`**

Add `playMode` to `createInitialState()`:

```js
playMode: "projector",   // "projector" | "interactive"
```

**`index.html`**

1. Add play-mode radio group as first section in `.lobby-inner` (before Game Mode):

```html
<section class="lobby-section">
  <h2 class="lobby-section-title">Como vamos jogar?</h2>
  <div class="lobby-play-mode">
    <label>
      <input type="radio" name="playMode" id="modeProjector" value="projector" checked>
      Projetor — professor apresenta, alunos assistem
    </label>
    <label>
      <input type="radio" name="playMode" id="modeInteractive" value="interactive">
      Interativo — cada aluno responde no dispositivo
    </label>
  </div>
</section>
```

2. Add "Criar sala para espectadores" checkbox in Effects section (for Projector mode only):

```html
<label id="lobbyEnableRoomLabel">
  <input type="checkbox" id="lobbyEnableRoom">
  Criar sala para espectadores (WebSocket)
</label>
```

This label is shown/hidden by lobby.js based on the selected play mode.

3. Hide the "Add players" rows when interactive is selected (players join from their devices — no pre-registration needed). Control via `hidden` on `.lobby-add-row` elements.

4. Add players panel in `.app` header area (only visible in interactive mode):

```html
<div id="playersPanel" class="players-panel" hidden>
  <div id="playersPanelTeam1" class="players-panel-team"></div>
  <div id="playersPanelTeam2" class="players-panel-team"></div>
</div>
```

5. Add answers panel in challenge section (only visible in interactive mode, after a round):

```html
<div id="answersPanel" class="answers-panel" hidden>
  <ul id="answersList"></ul>
</div>
```

**`src/ui/lobby.js`**

- Read `input[name="playMode"]` and write to `gameState.playMode`
- On radio change: toggle visibility of `#lobbyEnableRoomLabel` and `.lobby-add-row` elements
- Pass `gameState.playMode` and `enableRoom` flag to `onStart`:

```js
// in startGameBtn click handler:
gameState.playMode = document.querySelector('input[name="playMode"]:checked').value;
const enableRoom = gameState.playMode === "interactive"
  || document.getElementById("lobbyEnableRoom").checked;
onStart(enableRoom);
```

**`src/main.js`**

- `init(enableRoom)` already handles WebSocket conditional (from Spec 1)
- In `wireEvents()`: add check — if `gameState.playMode === "interactive"`, hide `.btn-correct`, `.btn-correct-help`, `.btn-wrong`, `#bonusCorrectBtn`
- Add `initPlayersPanel()` call in `init()` when `playMode === "interactive"`
- Add `emitChallenge()` call in `newChallenge()` when `playMode === "interactive"`:
  ```js
  // after renderChallenge(spec, ...) and applyRoundDifficulty() :
  if (gameState.playMode === "interactive") {
    emitChallenge({
      spec: sanitizeSpec(spec),              // spec without .answer and .bonus.answer
      answer: spec.answer || "",
      activeTeam: gameState.turnTeam,
      team1name: gameState.team1name,
      team2name: gameState.team2name,
      roundPointsFull: gameState.roundPointsFull,  // so server uses correct difficulty points
    });
  }
  ```
- Add `sanitizeSpec(spec)` helper in `main.js`:
  ```js
  function sanitizeSpec(spec) {
    const s = { ...spec };
    delete s.answer;
    if (s.bonus) s.bonus = { ...s.bonus, answer: undefined };
    return s;
  }
  ```
- Wire `onRoundResult` callback in `init()` (interactive mode only):
  ```js
  if (enableRoom && gameState.playMode === "interactive") {
    onRoundResult((result) => {
      addPoint(result.activeTeam, result.delta);
      // show answers panel
      const panel = document.getElementById("answersPanel");
      const list  = document.getElementById("answersList");
      list.innerHTML = "";
      result.teamAnswers.forEach(({ name, answer, correct }) => {
        const li = document.createElement("li");
        li.textContent = `${correct ? "✅" : "❌"} ${name} — "${answer}"`;
        list.appendChild(li);
      });
      panel.hidden = false;
      emitState(buildSnapshot());
    });
    onPlayerAnswered(({ name }) => {
      // mark player as answered in players panel (append ✓ to their badge)
      const badge = document.querySelector(`[data-player-name="${name}"]`);
      if (badge) badge.textContent = name + " ✓";
    });
  }
  ```
- Wire timer-end → `emitTimerExpired()`: use `setTimerEndCallback` (new export in `timer.js`):
  ```js
  if (gameState.playMode === "interactive") {
    setTimerEndCallback(() => emitTimerExpired());
  }
  ```

**`src/socket.js`**

Add new exports:

```js
/** Interactive: student joins a room */
export function connectAsPlayer(code, name, team) {
  const s = getSocket();
  s.connect();
  s.emit('player-join', { code: code.toUpperCase().trim(), name, team });
}

/** Interactive: student submits answer */
export function submitAnswer(answer) {
  getSocket().emit('submit-answer', { answer });
}

/** Interactive: host broadcasts challenge to students (server stores answer) */
export function emitChallenge(payload) {
  getSocket().emit('challenge-start', payload);
}

/** Interactive: host signals timer expired, server should resolve round */
export function emitTimerExpired() {
  getSocket().emit('timer-expired');
}

/** Interactive: student receives challenge */
export function onChallenge(cb) {
  const s = getSocket();
  s.off('challenge');
  s.on('challenge', cb);
}

/** Interactive: teacher sees a player confirmed answer */
export function onPlayerAnswered(cb) {
  const s = getSocket();
  s.off('player-answered');
  s.on('player-answered', cb);
}

/** Interactive: all clients receive round result */
export function onRoundResult(cb) {
  const s = getSocket();
  s.off('round-result');
  s.on('round-result', cb);
}

/** Interactive: new player joined the room */
export function onPlayerJoined(cb) {
  const s = getSocket();
  s.off('player-joined');
  s.on('player-joined', cb);
}

/** Interactive: receive full player list on join */
export function onPlayerList(cb) {
  const s = getSocket();
  s.off('player-list');
  s.on('player-list', cb);
}
```

**`server/index.js`**

Room structure extended:

```js
// existing room fields:
//   hostId, sockets[], stateSnapshot
// new fields:
rooms[code] = {
  hostId,
  sockets: [],                   // all socket IDs in room
  stateSnapshot: {},
  // interactive mode:
  players: {},                   // { [socketId]: { name, team } }
  currentAnswer: null,           // correct answer for active round
  activeTeam: null,              // 1 | 2
  answers: {},                   // { [socketId]: { name, answer, correct } }
  roundOpen: false,              // true while collecting answers
};
```

New server-side event handlers (added to existing socket event block):

```js
// Player joins room (interactive mode)
socket.on('player-join', ({ code, name, team }) => {
  if (!code || !/^[A-Z2-9]{4}$/.test(code)) {
    socket.emit('error', 'Invalid room code.'); return;
  }
  const room = rooms[code];
  if (!room) { socket.emit('error', 'Room not found.'); return; }
  if (!name || typeof name !== 'string' || name.length > 30) {
    socket.emit('error', 'Invalid name.'); return;
  }
  if (team !== 1 && team !== 2) {
    socket.emit('error', 'Invalid team.'); return;
  }
  room.sockets.push(socket.id);
  room.players[socket.id] = { name: name.trim(), team };
  socket.join(code);
  socket.data.roomCode = code;
  // Send existing player list to new joiner
  socket.emit('player-joined', {});  // confirms join to the student
  socket.emit('player-list', Object.values(room.players));
  // Broadcast new player to teacher
  io.to(room.hostId).emit('player-joined', { name: name.trim(), team });
});

// Host starts a challenge (interactive mode)
socket.on('challenge-start', ({ spec, answer, activeTeam, team1name, team2name, roundPointsFull }) => {
  if (typeof spec !== 'object' || spec === null) return;
  if (typeof answer !== 'string') return;
  if (activeTeam !== 1 && activeTeam !== 2) return;
  const code = socket.data.roomCode;
  const room = rooms[code];
  if (!room || socket.id !== room.hostId) return;
  // Store answer + points server-side
  room.currentAnswer = answer.toLowerCase().trim();
  room.activeTeam = activeTeam;
  room.roundPointsFull = typeof roundPointsFull === 'number' ? roundPointsFull : 5;
  room.answers = {};
  room.roundOpen = true;
  // Broadcast sanitized spec to all students (spec already sanitized by host)
  const playerSockets = Object.keys(room.players);
  playerSockets.forEach((sid) => {
    io.to(sid).emit('challenge', { spec, activeTeam, team1name, team2name });
  });
});

// Student submits answer
socket.on('submit-answer', ({ answer }) => {
  if (typeof answer !== 'string') return;
  const code = socket.data.roomCode;
  const room = rooms[code];
  if (!room || !room.roundOpen) return;
  const player = room.players[socket.id];
  if (!player) return;
  if (player.team !== room.activeTeam) return;  // only active team can answer
  if (room.answers[socket.id]) return;           // already answered
  const correct = answer.toLowerCase().trim() === room.currentAnswer;
  room.answers[socket.id] = { name: player.name, answer, correct };
  // Notify teacher
  io.to(room.hostId).emit('player-answered', { name: player.name, correct });
  // Check if all active team players answered
  const activePlayers = Object.entries(room.players)
    .filter(([, p]) => p.team === room.activeTeam)
    .map(([sid]) => sid);
  if (activePlayers.every(sid => room.answers[sid])) {
    resolveRound(code);
  }
});

// Host signals timer expired
socket.on('timer-expired', () => {
  const code = socket.data.roomCode;
  const room = rooms[code];
  if (!room || socket.id !== room.hostId || !room.roundOpen) return;
  resolveRound(code);
});
```

New `resolveRound(code)` function:

```js
function resolveRound(code) {
  const room = rooms[code];
  if (!room || !room.roundOpen) return;
  room.roundOpen = false;

  const activePlayers = Object.entries(room.players)
    .filter(([, p]) => p.team === room.activeTeam)
    .map(([sid]) => sid);

  const total = activePlayers.length || 1;
  const correctCount = activePlayers.filter(sid => room.answers[sid]?.correct).length;
  const teamCorrect = correctCount >= total / 2;

  // Build teamAnswers array for display
  const teamAnswers = activePlayers.map(sid => room.answers[sid] || {
    name: room.players[sid].name,
    answer: '(no answer)',
    correct: false,
  });

  // Update room scores
  const delta = teamCorrect ? (room.roundPointsFull || 5) : 0;
  if (room.activeTeam === 1) room.stateSnapshot.score1 = (room.stateSnapshot.score1 || 0) + delta;
  else                        room.stateSnapshot.score2 = (room.stateSnapshot.score2 || 0) + delta;

  const result = {
    activeTeam: room.activeTeam,
    correct: teamCorrect,
    delta,
    teamAnswers,
    score1: room.stateSnapshot.score1 || 0,
    score2: room.stateSnapshot.score2 || 0,
  };

  // Broadcast to all in room
  io.to(code).emit('round-result', result);
}
```

**`vite.config.js`**

Add `/play.html` to rollup input:

```js
input: {
  main:      resolve(__dirname, 'index.html'),
  spectator: resolve(__dirname, 'spectator.html'),
  play:      resolve(__dirname, 'play.html'),
}
```

### CSS additions (`styles/lobby.css`)

```css
.lobby-play-mode {
  display: flex;
  flex-direction: column;
  gap: .5rem;
}
.lobby-play-mode label {
  display: flex;
  align-items: center;
  gap: .5rem;
  cursor: pointer;
  padding: .5rem .75rem;
  border-radius: 8px;
  border: 2px solid var(--border);
}
.lobby-play-mode label:has(input:checked) {
  border-color: var(--accent-green);
  background: color-mix(in srgb, var(--accent-green) 10%, var(--bg-panel));
}
```

### Teacher UI additions (`styles/components.css`)

```css
/* Players panel — interactive mode */
.players-panel {
  display: flex;
  gap: 1rem;
  padding: .5rem .75rem;
  background: var(--bg-panel);
  border-radius: 8px;
  font-size: .85rem;
}
.players-panel-team { display: flex; flex-wrap: wrap; gap: .35rem; }

/* Answers panel */
.answers-panel {
  padding: .5rem .75rem;
  background: var(--bg-panel);
  border-radius: 8px;
  font-size: .85rem;
  margin-top: .5rem;
}
.answers-panel ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: .2rem; }
```

**`src/ui/timer.js`**

Add `setTimerEndCallback` export (mirrors the existing `setTimerTickCallback`):

```js
let _onEnd = null;
export function setTimerEndCallback(fn) { _onEnd = fn; }
```

Inside the `setInterval` block, when the timer reaches 0 (the interval clears):

```js
// where timer currently stops:
clearInterval(interval);
if (_onEnd) _onEnd();
```

`main.js` calls `setTimerEndCallback(() => emitTimerExpired())` in `init()` when interactive mode is active.

## What Does NOT Change

- `src/core/` — zero changes
- `src/modes/`, `src/data/` — zero changes
- `spectator.html` / `src/spectator.js` / `src/ui/spectatorView.js` — zero changes
- All existing Vitest tests — zero changes
- Projector mode behavior — identical when "Projetor" is selected in lobby

## Scoring Note

`resolveRound()` in the server sends `delta` for student display. The **host** (`main.js`) also receives `round-result` and calls `addPoint(activeTeam, delta)` to update `gameState` authoritatively. This keeps scoring logic in the client (where `addPoint` clamps to ≥0 etc.) rather than duplicating it server-side.

## Testing

Manual:
1. `cd server && node index.js` + `npm run dev`
2. Open `localhost:5173` → select "Interativo" → Start Game → room code appears
3. Open `localhost:5173/play.html` on another tab → enter code, name, team → join
4. Teacher clicks "New Challenge" → student sees challenge
5. Student submits answer → teacher sees ✓ → round auto-scores when all answered
6. Open a second student tab → timer timeout path: teacher's timer hitting 0 triggers auto-score
7. Select "Projetor" → "Criar sala" unchecked → no WebSocket errors in console
