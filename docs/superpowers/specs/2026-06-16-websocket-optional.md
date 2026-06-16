# Design: WebSocket Optional (Projector Mode Fix)

**Date:** 2026-06-16
**Status:** Approved

## Summary

The current app always calls `connectAsHost()` in `init()`, causing Socket.io polling errors in the browser console whenever the WebSocket server is not running. Fix this by making the WebSocket connection opt-in: the lobby gains a "Create room for spectators" checkbox. If unchecked, `connectAsHost()` is never called and the game runs fully offline.

## Problem

`src/main.js` → `init()` unconditionally calls `connectAsHost()`, which tries HTTP polling to `localhost:3001`. If the server is not running, the browser logs network errors on every poll interval. This is noisy and confusing when the teacher just wants to play locally without spectators.

## Solution

Add a checkbox to the lobby: **"Criar sala para espectadores"** (default: unchecked).

- Unchecked → game plays fully offline, no WebSocket, no room code badge.
- Checked → current behavior: `connectAsHost()` is called, room code appears in the header.

## Flow

```
Lobby: "Criar sala para espectadores" [ ] unchecked (default)
  → onStart(false) → init(false) → skip connectAsHost() → no polling

Lobby: "Criar sala para espectadores" [✓] checked
  → onStart(true) → init(true) → connectAsHost() → room code badge
```

## File Changes

### `index.html`

Add checkbox in the lobby Effects section, below the existing sound/confetti checkboxes:

```html
<label>
  <input type="checkbox" id="lobbyEnableRoom">
  Criar sala para espectadores (WebSocket)
</label>
```

Default unchecked (teachers who don't need spectators get no errors).

### `src/ui/lobby.js`

Read the checkbox value and pass it to `onStart`:

```js
// in startGameBtn click handler, before onStart():
const enableRoom = document.getElementById("lobbyEnableRoom").checked;
// change: onStart() → onStart(enableRoom)
onStart(enableRoom);
```

Update `initLobby` signature: `export function initLobby(onStart)` — no change to signature, but `onStart` now receives a boolean argument.

### `src/main.js`

Change the `initLobby` call at the bottom:

```js
// before:
initLobby(() => init());

// after:
initLobby((enableRoom) => init(enableRoom));
```

Change `init()` to accept and use the flag:

```js
// before:
function init() {
  wireEvents();
  // ...
  connectAsHost().then(...)
}

// after:
function init(enableRoom = false) {
  wireEvents();
  // ...
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

## What Does NOT Change

- `server/index.js` — zero changes
- `src/socket.js` — zero changes
- `spectator.html` / `src/spectator.js` — zero changes
- All existing Vitest tests — zero changes
- Projector mode behavior when checkbox is checked — identical to current

## Testing

1. Open lobby with checkbox unchecked → click Start → no network errors in console, room code badge stays hidden
2. Open lobby with checkbox checked → click Start → room code appears, spectator.html can join
