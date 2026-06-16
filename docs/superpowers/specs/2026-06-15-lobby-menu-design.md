# Design: Lobby / Initial Menu Screen

**Date:** 2026-06-15
**Status:** Approved

## Summary

Replace the Settings modal with a full-screen lobby that the teacher fills in before the game starts. After clicking "Start Game", the lobby disappears and the game view appears. During the game, a ⚙ button opens a compact in-game panel for the few actions still needed mid-session (reset scores, reshuffle challenges, toggle effects).

## Flow

```
Page load → #lobby visible, .app hidden
Teacher configures: mode, team names, players, effects
Teacher clicks "Start Game":
  1. Read lobby form → write to gameState
  2. connectAsHost() → receive room code
  3. hideLobby() → show .app
  4. init() runs (wires game events, resets timer, etc.)
  5. Room code badge appears in game header
```

## Lobby Layout (single scrollable screen)

```
┌─────────────────────────────────┐
│   🎮 English Tuesday            │
│      Team Battle!               │
│                                 │
│  ── Game Mode ──                │
│  [Random✓] [Name 3] [Emoji]...  │
│  [Complete] [Translation]...    │
│                                 │
│  ── Teams ──                    │
│  Team 1 name: [Blue Team____]   │
│  Team 2 name: [Red Team_____]   │
│                                 │
│  Blue Team players:             │
│  [...name input...] [Add]       │
│  • Alice  • Bob                 │
│                                 │
│  Red Team players:              │
│  [...name input...] [Add]       │
│                                 │
│  ── Effects ──                  │
│  ☑ Sounds  ☑ Confetti          │
│                                 │
│       [▶ Start Game]            │
└─────────────────────────────────┘
```

## In-Game Panel (⚙ button → floating panel)

Replaces the current Settings modal. Contains only in-game actions:
- Reset scores
- Reshuffle challenges
- Toggle sounds (checkbox)
- Toggle confetti (checkbox)

Panel closes when clicking outside or pressing Escape.

## File Changes

### New files

**`src/ui/lobby.js`**
- `initLobby()` — called from `main.js` on page load; wires lobby form events
- `hideLobby()` — hides `#lobby`, shows `.app`
- Reads mode buttons, team name inputs, player add buttons, effects checkboxes
- On "Start Game": validates (at least team names set), writes to `gameState`, calls `connectAsHost()`, then `hideLobby()`, then `init()`

**`src/ui/inGamePanel.js`**
- `initInGamePanel()` — wires ⚙ button to open/close the panel
- Contains: reset scores button, reshuffle button, sound checkbox, confetti checkbox
- Closes on outside click or Escape key

**`styles/lobby.css`**
- Full-screen dark lobby layout
- Mode buttons grid (same visual style as current `.mode-btn`)
- Two-column team section (blue / red)
- "Start Game" CTA button

### Modified files

**`index.html`**
- Add `<div id="lobby" class="lobby">...</div>` before `.app`
- Add `<div id="inGamePanel" class="in-game-panel" hidden>...</div>`
- Remove entire `#settingsModal` block
- `.app` gets `hidden` attribute initially
- ⚙ button (`settings-fab`) stays in place; its click now opens `#inGamePanel`

**`src/main.js`**
- Remove all imports and references to `openSettingsModal`, `closeSettingsModal`, `updateModeButtons`, `updatePlayerListEmpty`, `setTeamNames`, `addPlayer`, `setMode`, `randomMode` from `./ui/settings.js`
- Add import: `initLobby` from `./ui/lobby.js`
- Add import: `initInGamePanel` from `./ui/inGamePanel.js`
- Change bottom of file: replace `init()` auto-call with `initLobby(); initInGamePanel();`
- `init()` becomes a named export (called by `lobby.js` after "Start Game")

**`src/ui/settings.js`** — **deleted**
- All functionality moves to `lobby.js` (pre-game config) and `inGamePanel.js` (in-game actions)

**`styles/components.css`**
- Remove `.modal`, `.modal-backdrop`, `.modal-dialog`, `.modal-close`, `.modal-done`, `.modal-save-names`, `.modal-columns`, `.modal-team`, `.modal-add-row`, `.modal-empty`, `.settings-section`, `.settings-modes`, `.settings-row`, `.settings-reset-btn` rules
- Keep all other component styles untouched

## State Flow

`gameState` is written by `lobby.js` before `init()` runs:

```js
// In lobby.js startGame():
gameState.team1name = team1input.value.trim() || 'Blue Team';
gameState.team2name = team2input.value.trim() || 'Red Team';
gameState.soundEnabled = soundCheckbox.checked;
gameState.confettiEnabled = confettiCheckbox.checked;
// currentMode set via the same setMode()/randomMode() logic as before
// players already added to DOM lists by addPlayer() calls during lobby
```

## What Does NOT Change

- `src/core/` — zero changes
- `src/modes/`, `src/data/` — zero changes
- `src/ui/scoreboard.js`, `timer.js`, `log.js`, `challenge.js`, `doubleBanner.js`, `confetti.js`, `keyboard.js`, `audio.js` — zero changes
- `src/socket.js` — zero changes
- All existing Vitest tests — zero changes (they only test `core/` and `modes/`)

## Testing

Manual only (DOM-dependent):
1. Open `index.html` → lobby appears, game hidden
2. Select a mode, fill team names, add players, click Start
3. Game view appears, room code badge shows
4. ⚙ during game → in-game panel opens with reset/reshuffle/effects
5. All existing game actions (new challenge, correct, wrong, timer) work as before
