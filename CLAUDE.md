# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**"English Tuesday — Team Battle!"** is a projector/classroom game where a teacher runs ESL (English-for-Portuguese-speakers) challenges for two teams (Blue vs Red). It is a Vite-built ES module app: no backend, no network calls, no persistence (all state is in-memory and **resets on page reload**). The layout is designed for a full-screen 16:9 display (`100dvh`, `overflow:hidden`).

## Running

This project now requires Node tooling — opening `index.html` directly via `file://` no longer works (it loads `<script type="module" src="./src/main.js">`, which browsers block under `file://`).

- `npm install` — install dependencies (Vite, Vitest, ESLint, Prettier).
- `npm run dev` — start the Vite dev server and play the game.
- `npm run build` — production build into `dist/`.
- `npm run preview` — serve the `dist/` build locally.
- `npm test` — run the Vitest suite (`tests/*.test.js`, currently 6 files / 26 tests covering `core/` and `modes/`).
- `npm run test:watch` — Vitest in watch mode.
- `npm run lint` — ESLint (flat config) over the project.
- `npm run format` — Prettier over `src/**/*.js` and `tests/**/*.js`.

## File layout

```
index.html              # HTML shell only — no inline <style>/<script>/on* handlers
styles/
  base.css              # reset, CSS custom properties (theme), typography
  layout.css            # grid layout (.app, .app-body, .sidebar, .challenge-panel)
  components.css        # scoreboard, timer ring, modal, buttons, etc.
src/
  main.js               # bootstrap: imports everything, wireEvents() + init()
  audio.js              # WebAudio beeps
  core/                 # pure logic — zero DOM, fully unit-tested
    state.js            # gameState: single mutable state object (singleton)
    pool.js             # pickFromPool / usedPools — no-repeat selection
    scoring.js          # addPoint (clamp ≥ 0), BONUS_POINTS = 3
    difficulty.js        # DIFFICULTY_META, applyDifficulty
    turns.js            # team alternation, player rotation
    double.js           # double-or-nothing rules (DOUBLE_STREAK = 3)
  modes/
    registry.js         # GameMode/RenderSpec contract + createRegistry + modes[] order
    name3.js, emoji.js, sentence.js, translation.js, oddOne.js, rhyme.js, describe.js
  data/                 # pure challenge pools, one file per mode (no app imports)
    name3.js, emoji.js, sentence.js, translation.js, oddOne.js, rhyme.js, describe.js
  ui/                   # DOM layer
    challenge.js, scoreboard.js, timer.js, log.js, settings.js,
    doubleBanner.js, confetti.js, keyboard.js
tests/
  pool.test.js, scoring.test.js, difficulty.test.js, turns.test.js,
  double.test.js, modes.test.js
```

### Import-direction rules

- `core/` imports nothing app-internal (pure logic, fully testable in isolation).
- `data/` imports nothing (plain literals + JSDoc typedefs).
- `modes/` import from `core/` and `data/`.
- `ui/` imports from `core/` and may import from other `ui/` modules, but acyclically.
- `src/main.js` is the only place that wires everything together (imports core + modes + ui, registers event listeners, runs `init()`).

## Core architecture

**The `modes` registry** (`src/modes/registry.js`) is an ordered array of `GameMode` objects. The array order defines the indices used by `setMode(0..6)` and **must match the order of the mode buttons in `index.html`**:
`0` Name 3 Things · `1` Emoji + Sentence · `2` Complete the Sentence (multiple choice) · `3` Translation + Negative · `4` Odd One Out (multiple choice) · `5` Rhyme Time · `6` Describe It!

Each `GameMode` has `{ key, title, pool, render, answerLabel? }`. `render(item) → RenderSpec` is a pure function that turns one challenge-pool item into `{ promptHtml, answer, bonus?, options?, emojiHtml?, panelClass?, showReveal? }`. `createRegistry()` validates this contract at load time (required props present, non-empty pool, `render` is a function) — see the JSDoc typedefs at the top of `registry.js` for the full shape.

**Game loop is `newChallenge()` in `src/main.js`.** It is now a generic dispatcher: it picks the active `GameMode` from `modes[currentMode]` (or rolls a random one when `isRandom` is true), pulls an item from that mode's pool via `pickFromPool`, calls `mode.render(item)`, and hands the resulting `RenderSpec` to `ui/challenge.js` (`renderChallenge`) to paint the prompt/options/emoji/bonus areas. `currentAnswer` and the optional bonus are taken from the `RenderSpec`.

**No-repeat selection:** `pickFromPool(pool, key)` (in `core/pool.js`) tracks served items in `gameState.usedPools[key]` and only reshuffles when the pool is exhausted (`resetUsedPools()` / "Reshuffle challenges" button). Each `GameMode.key` must have a corresponding entry handled by `usedPools`.

**Difficulty** is per challenge item (`difficulty: "easy"|"medium"|"hard"`). `core/difficulty.js` exports `DIFFICULTY_META` (easy = 4 pts / 40s, medium = 5 / 50, hard = 6 / 60, "help" answer = full points − 1) and `applyDifficulty`, which is applied when a challenge loads.

**Scoring & turns:** `addPoint` (in `ui/scoreboard.js`, built on `core/scoring.js`) mutates `gameState.score1`/`score2` (clamped ≥ 0). `advanceTeamTurn` (in `core/turns.js`) alternates `gameState.activeTeam`; `nextAnsweringPlayer` rotates through that team's roster. `markCorrect`/`markWrong` (in `src/main.js`) close out a round.

**Double-or-Nothing** (`core/double.js`): `DOUBLE_STREAK = 3` consecutive correct answers by a team triggers a bet banner (`trackCorrect` → `showDoubleBanner`). Accepting (`acceptDoubleBet`) sets `gameState.doubleActive`; the next round's result routes through `settleDouble` (correct = points ×2, wrong = subtract).

**Bonus sub-challenges** (`BONUS_POINTS = 3`, in `core/scoring.js`): an optional second task per round, supplied via `RenderSpec.bonus`, revealed/scored via `revealBonus` / `markBonusCorrect`.

**State:** all mutable game state (scores, active team, difficulty, timer state, usedPools, double-or-nothing flags, etc.) lives in the single `gameState` object exported from `src/core/state.js`. Avoid adding new top-level `let`/global variables for game state — extend `gameState` instead.

## Conventions

- **Code comments are mixed English and Portuguese; user-facing UI text is English** (it is an English-teaching tool). Some log/reveal strings are Portuguese ("Exemplos:"). Keep player-facing prompts in English.
- DOM elements are addressed by hardcoded string IDs; team-scoped IDs follow the `team{1|2}list`, `score{1|2}`, `scorePanel{1|2}` pattern.
- Theming is dark-only via CSS custom properties on `:root` (team colors `--team1`/`--accent-red`), defined in `styles/base.css`. Layout is CSS grid (`.app` → header + `.app-body` → `.sidebar` + `.challenge-panel`), defined in `styles/layout.css`.
- No persistence — state resets on page reload (no `localStorage`, no network calls).
- `core/` modules must stay DOM-free and covered by Vitest tests in `tests/`.

## Common edits

- **Add challenges to an existing mode:** append objects to the relevant pool array in `src/data/<mode>.js`, matching that file's existing field shape (e.g. `name3.js` uses `{text, examples, difficulty}`; `emoji.js` uses `{emoji, answer, difficulty}`; choice modes carry `options`/`items` + the correct key). Each data file has a JSDoc typedef documenting its item shape.
- **Add a new mode:**
  1. Create `src/data/<mode>.js` with the new pool (plain array of items + JSDoc typedef).
  2. Create `src/modes/<mode>.js` exporting a `GameMode` object (`key`, `title`, `pool`, `render`, optional `answerLabel`).
  3. Register it in `src/modes/registry.js`'s `modes` array — **the position in this array becomes its `setMode(n)` index**.
  4. Add a `.mode-btn` button in `index.html` in the same order as the registry — wiring is positional: `wireEvents()` in `src/main.js` binds `querySelectorAll(".mode-btn")[i]` to `setMode(i)` (no inline handlers).
  5. If the new mode needs no-repeat tracking, ensure `core/pool.js`/`gameState.usedPools` handles the new `key` (it is keyed dynamically, so a new `key` just needs the pool to exist).
