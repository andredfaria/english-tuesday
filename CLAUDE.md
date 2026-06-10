# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`index.html` is the entire application: **"English Tuesday — Team Battle!"**, a projector/classroom game where a teacher runs ESL (English-for-Portuguese-speakers) challenges for two teams (Blue vs Red). There is no build system, no package manager, no dependencies, no backend, and no tests.

## Running

Open `index.html` directly in a browser (double-click or `file://`). All state is in-memory JS globals and **resets on page reload** — there is no persistence (no `localStorage`, no network calls). The layout is designed for a full-screen 16:9 display (`100dvh`, `overflow:hidden`).

## File layout (single file, three regions)

- **`<style>` (lines ~8–196):** all CSS. Theming via CSS custom properties on `:root` (dark-only; team colors `--team1`/`--accent-red`). Layout is CSS grid (`.app` → header + `.app-body` → `.sidebar` + `.challenge-panel`).
- **`<body>` (lines ~198–359):** settings modal first, then the `.app` shell (scoreboard chips, timer ring, log sidebar, challenge panel, mode buttons). Behavior is wired with inline `onclick=` handlers calling global functions.
- **`<script>` (lines ~360–1296):** mutable global state at the top, then function definitions, then the **challenge data pools at the very bottom** (`name3Challenges`, `emojiPuzzles`, `sentenceChallenges`, `translationChallenges`, `oddOneChallenges`, `rhymeChallenges`, `describeChallenges`).

## Core architecture

**Game loop is `newChallenge()` (line ~762).** It is a 7-branch dispatcher on the global `currentMode` (0–6). When `isRandom` is true it rolls a random mode each round. Each branch: pulls an item from its pool via `pickFromPool`, renders prompt HTML into `#challengeText` (plus `#emojiArea` or `#optionsArea` for choice modes), sets `currentAnswer`, and registers an optional bonus via `setupBonus`.

The 7 modes (index → title, kept in the `titles` array inside `newChallenge`):
`0` Name 3 Things · `1` Emoji + Sentence · `2` Complete the Sentence (multiple choice) · `3` Translation + Negative · `4` Odd One Out (multiple choice) · `5` Rhyme Time · `6` Describe It!

**No-repeat selection:** `pickFromPool(pool, key)` tracks served items in `usedPools[key]` and only reshuffles when the pool is exhausted (`resetUsedChallenges` / "Reshuffle challenges" button). Each pool needs a matching key in the `usedPools` object (line ~400).

**Difficulty** is per challenge item (`difficulty: "easy"|"medium"|"hard"`). `DIFFICULTY_META` maps difficulty → round points and timer seconds; `applyRoundDifficulty` applies it when a challenge loads.

**Scoring & turns:** `addPoint` mutates `score1`/`score2` (clamped ≥ 0). `activeTeam` alternates via `advanceTeamTurn`; `assignAnsweringPlayer` rotates through that team's roster (`playerTurnIndex`). `markCorrect`/`markWrong` close out a round.

**Double-or-Nothing:** 3 consecutive correct answers by a team (`consecutiveCorrect`) triggers a bet banner (`checkDoubleOrNothing` → `showDoubleBanner`). Accepting sets `doubleActive`; the next round's result routes through `resolveDouble` (correct = points ×2, wrong = subtract). Flow is documented in the block comment at line ~646.

**Bonus sub-challenges** (`BONUS_POINTS = 3`): an optional second task per round, revealed/scored via `revealBonus` / `markBonusCorrect`.

## Conventions

- **Plain ES5-style globals + DOM `getElementById`.** No framework, no modules, no `const`-scoped app object — functions and state are top-level. Match this style; do not introduce a build step or bundler.
- **Code comments are mixed English and Portuguese; user-facing UI text is English** (it is an English-teaching tool). Some log/reveal strings are Portuguese ("Exemplos:"). Keep player-facing prompts in English.
- DOM elements are addressed by hardcoded string IDs; team-scoped IDs follow the `team{1|2}list`, `score{1|2}`, `scorePanel{1|2}` pattern.

## Common edits

- **Add challenges to an existing mode:** append objects to the relevant `*Challenges`/`*Puzzles` array at the bottom, matching that array's existing field shape (e.g. Name 3 uses `{text, examples, difficulty}`; emoji uses `{emoji, answer, difficulty}`; choice modes carry `options`/`items` + the correct key).
- **Add a new mode:** add a branch in `newChallenge`, add its title to the `titles` array (and bump the `Math.random()*7` count), create a data pool, add its key to `usedPools`, and add a mode button in the body that calls `setMode(n)`.
