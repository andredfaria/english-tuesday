# Design: WebSocket Spectator Mode

**Date:** 2026-06-14
**Status:** Approved

## Summary

Add real-time spectator support to English Tuesday so students can follow the game live on their own devices (phones/tablets) while the teacher controls everything from the projector screen. Uses Socket.io over WebSocket with a cloud-hosted Node.js server.

## Architecture

Two deployable pieces in one repository:

```
┌─────────────────────────────────────────────────────┐
│  server/                                            │
│    index.js       ← Node.js + Socket.io server      │
│    package.json                                     │
└─────────────────────────────────────────────────────┘
          ▲  WebSocket (wss://)
          │
┌─────────┴─────────────────────────────────────────┐
│  Frontend (Vite)                                   │
│  /             → HOST VIEW   (teacher, existing)   │
│  /spectator    → SPECTATOR VIEW  (students, new)   │
└────────────────────────────────────────────────────┘
```

The server is stateless beyond room management — it relays messages but knows nothing about game rules. All logic stays in `src/core/`.

## Room Flow

1. Teacher opens `/` → clicks "Create Room" → receives a 4-char code (e.g. `F7KQ`)
2. Students open `/spectator` on their phones → type the code → enter the room
3. Every host action (new challenge, score, timer) → `emitState(snapshot)` → server broadcasts to all room members → student screens update

## Server Events

```
Server listens for:
  create-room              → host creates room, server generates 4-char code
  join-room (code)         → spectator joins room
  state-update (data)      → host sends game snapshot → server broadcasts to room

Server emits:
  room-created (code)      → confirmation to host with generated code
  room-joined (snapshot)   → current state snapshot for newly joined spectator
  state (data)             → broadcast to all spectators in the room
  error (msg)              → room not found, invalid code, etc.
```

**Room lifecycle:**
- Room expires after 4 hours of inactivity (prevents memory leaks)
- Host disconnect: room marked "no host" → spectators see "Waiting for teacher..." banner
- Host reconnect with same code: room resumes

## Frontend Changes

### New files

**`src/socket.js`** — Socket.io client singleton:
- `connectAsHost(roomCode?)` — create or reconnect to a room
- `connectAsSpectator(roomCode)` — join as spectator
- `emitState(snapshot)` — host sends current game state
- `onState(callback)` — spectator listens for updates
- `onError(callback)` — handles room not found, etc.

**`src/spectator.html`** — second HTML entry point (Vite multi-page):
- Code entry field (shown before joining)
- Game view (shown after joining): current challenge, scores, timer, active team
- Mobile-first responsive layout (different from the 16:9 projector layout)

**`src/spectator.js`** — entry point for spectator page:
- Connects via `connectAsSpectator(code)`
- Renders incoming state snapshots to the spectator DOM

### Modified files

**`vite.config.js`** — add `spectator.html` as second build entry (multi-page app).

**`src/main.js`** — minimal additions:
- On init: `connectAsHost()` → display room code in UI
- After each state-changing action (`newChallenge`, `markCorrect`, `markWrong`, `addPoint`, timer tick): call `emitState(buildSnapshot())`
- `buildSnapshot()` extracts the relevant subset of `gameState` (scores, active challenge, timer, active team)

**`index.html`** — add a small "Room: F7KQ" badge visible to teacher (can be toggled off).

### Untouched

`src/core/`, `src/modes/`, `src/data/`, `src/ui/` — zero changes. All game logic stays as-is.

## State Snapshot Shape

```js
{
  // Scores
  score1: number,
  score2: number,
  team1name: string,
  team2name: string,
  activeTeam: 1 | 2,

  // Current challenge
  modeTitle: string,
  spec: RenderSpec,          // promptHtml, options, emojiHtml, etc.
  currentDifficulty: string,
  roundPointsFull: number,
  currentAnsweringPlayer: string,

  // Timer
  timerRunning: boolean,
  timerSecondsLeft: number,

  // Round state
  roundLocked: boolean,
  doubleActive: boolean,
  doubleTeam: 0 | 1 | 2,
}
```

## Deployment

### Server — Railway (or Render)
- `server/` has its own `package.json` with `socket.io` dependency
- Auto-deploy on `git push` to main
- Final URL: `wss://english-tuesday-server.railway.app` (or similar)

### Frontend — Netlify (already configured)
- Add env var `VITE_WS_URL=wss://english-tuesday-server.railway.app` in Netlify dashboard
- `spectator.html` built as second page automatically via Vite multi-page config
- No changes to build command (`npm run build → dist/`)

### Local development
```
Terminal 1: cd server && node index.js   # port 3001
Terminal 2: npm run dev                  # Vite port 5173
```
`.env.local` → `VITE_WS_URL=ws://localhost:3001`

## Testing

- Unit tests: `src/core/` stays fully tested, no new unit tests needed there
- Integration: manual test with two browser tabs (host + spectator) locally
- The `socket.js` module should be mockable (export the socket instance) so future tests can stub it if needed
