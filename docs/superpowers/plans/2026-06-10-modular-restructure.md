# Reestruturação Modular — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o `index.html` monolítico (1297 linhas) em estrutura modular (Vite + ES modules + Vitest) sem nenhuma mudança de comportamento, visual ou regra de jogo.

**Architecture:** Camadas `core/` (lógica pura, zero DOM) → `modes/` (registro de modos, cada modo um módulo) → `data/` (pools) → `ui/` (DOM) → `main.js` (wiring). O dispatcher de 7 branches em `newChallenge()` vira um registro genérico. Estado global vai para um objeto `gameState` único.

**Tech Stack:** JavaScript vanilla (ES modules), Vite, Vitest, ESLint (flat) + Prettier. Sem TypeScript, sem framework.

**Spec:** `docs/superpowers/specs/2026-06-10-modular-restructure-design.md`

**Branch:** `refactor/modular-structure` (já existe — trabalhar nela).

---

## Convenções deste plano

1. **"Mover verbatim `nomeDaFuncao`"** = recortar a função/constante inteira do arquivo de origem (procurar pela declaração `function nomeDaFuncao(` ou `const nome=`) e colá-la **sem alterar uma linha** no destino, adicionando apenas `export ` na frente quando indicado. Linhas de origem citadas referem-se ao `index.html` original (commit `68df4fd`) — após a Task 3 o código vive em `src/main.js`, procure pelo nome do símbolo.
2. **Regra de ouro:** ao fim de CADA task, `npm run dev` deve servir o jogo funcionando igual ao original. Se uma verificação manual falhar, não prossiga — conserte.
3. **Smoke test rápido** (citado pelas tasks) = abrir `npm run dev`, clicar New Challenge ~3 vezes, marcar um correto e um errado, ver placar e log atualizando, sem erros no console do navegador.
4. Os testes Vitest rodam com `npm test` (= `vitest run`). Ambiente node — `core/` e `modes/` não tocam DOM.
5. Commits pequenos por task, com `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## Mapa final de arquivos

```
index.html                  # esqueleto HTML puro (sem CSS/JS inline)
package.json, vite.config.js, eslint.config.js, .prettierrc
styles/base.css  styles/layout.css  styles/components.css
src/main.js                 # bootstrap + wiring de eventos + orquestração de rodada
src/audio.js
src/core/{state,pool,scoring,difficulty,turns,double}.js
src/modes/{registry,name3,emoji,sentence,translation,oddOne,rhyme,describe}.js
src/data/{name3,emoji,sentence,translation,oddOne,rhyme,describe}.js
src/ui/{challenge,scoreboard,timer,log,settings,doubleBanner,confetti,keyboard}.js
tests/{pool,scoring,difficulty,turns,double,modes}.test.js
```

---

### Task 1: Scaffold de tooling (Vite + Vitest + ESLint + Prettier)

**Files:**
- Create: `package.json`, `vite.config.js`, `eslint.config.js`, `.prettierrc`
- Modify: `.gitignore`

- [ ] **Step 1: Criar package.json**

```json
{
  "name": "english-tuesday",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write \"src/**/*.js\" \"tests/**/*.js\""
  }
}
```

- [ ] **Step 2: Instalar devDependencies**

Run: `npm install -D vite vitest eslint @eslint/js globals prettier`
Expected: `package-lock.json` criado, sem erros.

- [ ] **Step 3: Criar vite.config.js**

```js
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  test: {
    environment: "node",
  },
});
```

- [ ] **Step 4: Criar eslint.config.js**

```js
import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      "no-empty": "off",
      "no-unused-vars": ["error", { args: "none" }],
    },
  },
  { ignores: ["dist/", "node_modules/"] },
];
```

- [ ] **Step 5: Criar .prettierrc**

```json
{
  "printWidth": 100
}
```

- [ ] **Step 6: Atualizar .gitignore** — acrescentar ao final:

```
# Node / build
node_modules/
dist/
```

- [ ] **Step 7: Verificar que o Vite serve o jogo monolítico intacto**

Run: `npm run dev` (em background) e abrir a URL. Smoke test rápido (convenção 3). O Vite serve `index.html` da raiz por padrão — nenhuma mudança no HTML é necessária nesta task. Parar o servidor depois.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.js eslint.config.js .prettierrc .gitignore
git commit -m "chore: scaffold Vite + Vitest + ESLint + Prettier"
```

---

### Task 2: Extrair CSS para styles/

**Files:**
- Create: `styles/base.css`, `styles/layout.css`, `styles/components.css`
- Modify: `index.html` (remover `<style>`, adicionar 3 `<link>`)

O CSS vive entre `<style>` (linha 8) e `</style>` (linha ~196). A divisão é por faixas **contíguas** — a concatenação dos 3 arquivos deve ser idêntica ao bloco original (garantia de zero mudança visual):

- [ ] **Step 1: Criar `styles/base.css`** — mover verbatim as regras desde `:root {` até `body::after{...}` inclusive (linhas 9–22: variáveis, reset `*`, `html,body`, `body`, `body::after`).

- [ ] **Step 2: Criar `styles/layout.css`** — mover verbatim desde `.app{` até `.team-turn:empty{display:none}` inclusive (linhas 23–70: grid do app, header, score chips, sidebar, timer ring, log, challenge panel, badges, team-turn).

- [ ] **Step 3: Criar `styles/components.css`** — mover verbatim todo o restante do CSS (linha 71 até a última regra antes de `</style>`: estados idle/locked, botões, options, modal, banner double, confetti canvas, etc.).

- [ ] **Step 4: Substituir o bloco `<style>...</style>` no `<head>` por:**

```html
  <link rel="stylesheet" href="./styles/base.css">
  <link rel="stylesheet" href="./styles/layout.css">
  <link rel="stylesheet" href="./styles/components.css">
```

- [ ] **Step 5: Verificar perda zero**

Run: `wc -l styles/*.css` e conferir que a soma das linhas ≈ bloco original (~188 linhas de regras). `npm run dev` → layout pixel-idêntico (header, sidebar, painel, modal de settings abre estilizado).

- [ ] **Step 6: Commit**

```bash
git add index.html styles/
git commit -m "refactor: extrai CSS para styles/ (base, layout, components)"
```

---

### Task 3: Mover o JS para src/main.js como ES module (com ponte global temporária)

**Files:**
- Create: `src/main.js`
- Modify: `index.html`

Os handlers inline (`onclick=`) exigem funções globais; ES modules não expõem nada em `window`. A ponte abaixo mantém os handlers funcionando até a Task 9 removê-los.

- [ ] **Step 1: Criar `src/main.js`** com TODO o conteúdo entre `<script>` (linha 360) e `</script>` (linha 1296), movido verbatim.

- [ ] **Step 2: Adicionar a ponte global no FINAL de `src/main.js`:**

```js
// ── PONTE TEMPORÁRIA (removida na Task 9) ──
// Expõe em window as funções chamadas por handlers inline no index.html.
Object.assign(window, {
  openSettingsModal, closeSettingsModal, randomMode, setMode, setTeamNames,
  addPlayer, resetScores, resetUsedChallenges,
  acceptDouble, declineDouble,
  startTimer, pauseTimer, resetTimer,
  revealAnswer, revealBonus, markCorrect, markBonusCorrect, markWrong,
  newChallenge,
  setSoundEnabled: (v) => { soundEnabled = v; },
  setConfettiEnabled: (v) => { confettiEnabled = v; },
});
```

- [ ] **Step 3: No `index.html`,** substituir o bloco `<script>...</script>` inteiro por:

```html
<script type="module" src="./src/main.js"></script>
```

- [ ] **Step 4: Corrigir os DOIS checkboxes de efeitos** (os inline `onchange` antigos atribuíam a `window.soundEnabled`, que NÃO é mais a variável do módulo — sem isso o toggle quebra silenciosamente):

```html
<label><input type="checkbox" id="soundEnabled" checked onchange="setSoundEnabled(this.checked)"> Sounds</label>
<label><input type="checkbox" id="confettiEnabled" checked onchange="setConfettiEnabled(this.checked)"> Confetti on correct</label>
```

- [ ] **Step 5: Verificação manual completa** — smoke test rápido + adicionalmente: abrir settings e desligar "Sounds" (marcar um correto: sem beep), religar (beep volta); Enter no campo de player adiciona; botões do double funcionam (forçar 3 corretos seguidos).

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.js
git commit -m "refactor: move JS para src/main.js como ES module com ponte global temporária"
```

---

### Task 4: Extrair pools de desafios para src/data/

**Files:**
- Create: `src/data/name3.js`, `src/data/emoji.js`, `src/data/sentence.js`, `src/data/translation.js`, `src/data/oddOne.js`, `src/data/rhyme.js`, `src/data/describe.js`
- Modify: `src/main.js`

- [ ] **Step 1: Para cada pool, criar o arquivo de dados.** Mover verbatim o array de `src/main.js` para o arquivo, prefixando `export `. Mapeamento exato:

| Array em main.js | Arquivo destino |
|---|---|
| `const name3Challenges=[...]` | `src/data/name3.js` → `export const name3Challenges = [...]` |
| `const emojiPuzzles=[...]` | `src/data/emoji.js` → `export const emojiPuzzles = [...]` |
| `const sentenceChallenges=[...]` | `src/data/sentence.js` → `export const sentenceChallenges = [...]` |
| `const translationChallenges=[...]` | `src/data/translation.js` → `export const translationChallenges = [...]` |
| `const oddOneChallenges=[...]` | `src/data/oddOne.js` → `export const oddOneChallenges = [...]` |
| `const rhymeChallenges=[...]` | `src/data/rhyme.js` → `export const rhymeChallenges = [...]` |
| `const describeChallenges=[...]` | `src/data/describe.js` → `export const describeChallenges = [...]` |

Cada arquivo de dados leva um JSDoc de 1 bloco no topo documentando o shape do item, ex. em `name3.js`:

```js
/** @typedef {{text: string, examples: string, difficulty: "easy"|"medium"|"hard"}} Name3Item */
```

(shapes dos demais: emoji `{emoji,answer,difficulty}`; sentence `{sentence,options,answer,difficulty}`; translation `{text,type,answer,negative,difficulty}`; oddOne `{items,odd,reason,difficulty}`; rhyme `{word,rhymes,extra,difficulty}`; describe `{word,ptAnswer,sentence,difficulty}`.)

- [ ] **Step 2: Adicionar imports no topo de `src/main.js`:**

```js
import { name3Challenges } from "./data/name3.js";
import { emojiPuzzles } from "./data/emoji.js";
import { sentenceChallenges } from "./data/sentence.js";
import { translationChallenges } from "./data/translation.js";
import { oddOneChallenges } from "./data/oddOne.js";
import { rhymeChallenges } from "./data/rhyme.js";
import { describeChallenges } from "./data/describe.js";
```

- [ ] **Step 3: Verificar** — `npm run dev`, jogar 1 rodada de cada um dos 7 modos (selecionar modo no modal de settings). Sem erros no console.

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "refactor: extrai pools de desafios para src/data/"
```

---

### Task 5: core/state.js + core/pool.js (TDD)

**Files:**
- Create: `src/core/state.js`, `src/core/pool.js`, `tests/pool.test.js`
- Modify: `src/main.js`

- [ ] **Step 1: Criar `src/core/state.js`** (novo código, completo):

```js
/**
 * Estado mutável único do jogo. Mesma semântica dos antigos globais soltos —
 * sem store reativa: quem muda o estado chama a função de UI correspondente.
 */
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
    usedPools: {},
  };
}

export const gameState = createInitialState();

/** Restaura o estado inicial (uso: testes e reset). */
export function resetGameState() {
  Object.assign(gameState, createInitialState());
}
```

- [ ] **Step 2: Escrever o teste que falha — `tests/pool.test.js`:**

```js
import { describe, it, expect, beforeEach } from "vitest";
import { gameState, resetGameState } from "../src/core/state.js";
import { pickFromPool, resetUsedPools } from "../src/core/pool.js";

const pool = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }];

describe("pickFromPool (no-repeat)", () => {
  beforeEach(() => resetGameState());

  it("serve cada item exatamente uma vez antes de repetir", () => {
    const served = new Set();
    for (let i = 0; i < pool.length; i++) served.add(pickFromPool(pool, "k").id);
    expect(served.size).toBe(pool.length);
  });

  it("ao esgotar o pool, reseta e continua servindo sem repetir no novo ciclo", () => {
    const counts = {};
    for (let i = 0; i < pool.length * 2; i++) {
      const it = pickFromPool(pool, "k");
      counts[it.id] = (counts[it.id] || 0) + 1;
    }
    Object.values(counts).forEach((c) => expect(c).toBe(2));
  });

  it("pools com chaves diferentes são independentes", () => {
    for (let i = 0; i < pool.length; i++) pickFromPool(pool, "k1");
    expect(gameState.usedPools["k2"] || []).toHaveLength(0);
  });

  it("inicializa a chave sob demanda (modo novo não exige tocar o state)", () => {
    expect(() => pickFromPool(pool, "chave-nova")).not.toThrow();
    expect(gameState.usedPools["chave-nova"]).toHaveLength(1);
  });

  it("resetUsedPools limpa todo o rastreio", () => {
    pickFromPool(pool, "k");
    resetUsedPools();
    expect(gameState.usedPools).toEqual({});
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `src/core/pool.js` não existe.

- [ ] **Step 4: Criar `src/core/pool.js`** (lógica idêntica à original, com lazy-init da chave):

```js
import { gameState } from "./state.js";

/** Sorteia um item do pool sem repetir até esgotar (rastreio em gameState.usedPools). */
export function pickFromPool(pool, key) {
  if (!gameState.usedPools[key]) gameState.usedPools[key] = [];
  if (gameState.usedPools[key].length >= pool.length) gameState.usedPools[key] = [];
  let idx;
  do { idx = Math.floor(Math.random() * pool.length); } while (gameState.usedPools[key].includes(idx));
  gameState.usedPools[key].push(idx);
  return pool[idx];
}

export function resetUsedPools() {
  gameState.usedPools = {};
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test`
Expected: PASS (5 testes).

- [ ] **Step 6: Usar em `src/main.js`:**
  - Adicionar `import { gameState } from "./core/state.js";` e `import { pickFromPool, resetUsedPools } from "./core/pool.js";`
  - Apagar de main.js: a declaração `const usedPools={...}` e as funções `pickFromPool` e `resetUsedChallenges`.
  - Recriar o wrapper com log (era `resetUsedChallenges`):

```js
function resetUsedChallenges() { resetUsedPools(); addToLog("Challenge deck reshuffled."); }
```

- [ ] **Step 7: Verificar** — `npm test` + smoke test rápido + botão "Reshuffle challenges" loga no log.

- [ ] **Step 8: Commit**

```bash
git add src/ tests/
git commit -m "refactor: core/state e core/pool com testes (no-repeat)"
```

---

### Task 6: core/scoring.js + core/difficulty.js (TDD)

**Files:**
- Create: `src/core/scoring.js`, `src/core/difficulty.js`, `tests/scoring.test.js`, `tests/difficulty.test.js`
- Modify: `src/main.js`

- [ ] **Step 1: Escrever testes que falham — `tests/scoring.test.js`:**

```js
import { describe, it, expect, beforeEach } from "vitest";
import { gameState, resetGameState } from "../src/core/state.js";
import { addScore, BONUS_POINTS } from "../src/core/scoring.js";

describe("addScore", () => {
  beforeEach(() => resetGameState());

  it("soma pontos ao time certo", () => {
    addScore(1, 5);
    addScore(2, 3);
    expect(gameState.score1).toBe(5);
    expect(gameState.score2).toBe(3);
  });

  it("default é +1 quando amount é omitido", () => {
    addScore(1);
    expect(gameState.score1).toBe(1);
  });

  it("nunca deixa o placar ficar negativo (clamp em 0)", () => {
    addScore(1, 3);
    addScore(1, -10);
    expect(gameState.score1).toBe(0);
  });

  it("retorna o novo placar do time", () => {
    expect(addScore(2, 4)).toBe(4);
  });

  it("BONUS_POINTS é 3", () => {
    expect(BONUS_POINTS).toBe(3);
  });
});
```

**`tests/difficulty.test.js`:**

```js
import { describe, it, expect, beforeEach } from "vitest";
import { gameState, resetGameState } from "../src/core/state.js";
import { DIFFICULTY_META, getDifficultyMeta, applyDifficulty } from "../src/core/difficulty.js";

describe("difficulty", () => {
  beforeEach(() => resetGameState());

  it("easy=4pts/40s, medium=5pts/50s, hard=6pts/60s", () => {
    expect(DIFFICULTY_META.easy).toMatchObject({ points: 4, seconds: 40 });
    expect(DIFFICULTY_META.medium).toMatchObject({ points: 5, seconds: 50 });
    expect(DIFFICULTY_META.hard).toMatchObject({ points: 6, seconds: 60 });
  });

  it("dificuldade desconhecida cai em medium", () => {
    expect(getDifficultyMeta("banana")).toBe(DIFFICULTY_META.medium);
    expect(getDifficultyMeta(undefined)).toBe(DIFFICULTY_META.medium);
  });

  it("applyDifficulty ajusta timer e pontos da rodada (help = full − 1)", () => {
    applyDifficulty("hard");
    expect(gameState.currentDifficulty).toBe("hard");
    expect(gameState.timerDuration).toBe(60);
    expect(gameState.roundPointsFull).toBe(6);
    expect(gameState.roundPointsHelp).toBe(5);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL (módulos não existem).

- [ ] **Step 3: Criar `src/core/scoring.js`:**

```js
import { gameState } from "./state.js";

export const BONUS_POINTS = 3;

/** Soma (ou subtrai) pontos do time, clampando em ≥ 0. Retorna o novo placar. */
export function addScore(team, amount) {
  const delta = amount === undefined ? 1 : amount;
  if (team === 1) gameState.score1 = Math.max(0, gameState.score1 + delta);
  else gameState.score2 = Math.max(0, gameState.score2 + delta);
  return team === 1 ? gameState.score1 : gameState.score2;
}
```

**`src/core/difficulty.js`:**

```js
import { gameState } from "./state.js";

export const DIFFICULTY_META = {
  easy:   { points: 4, seconds: 40, label: "Easy",   badgeClass: "difficulty-badge--easy" },
  medium: { points: 5, seconds: 50, label: "Medium", badgeClass: "difficulty-badge--medium" },
  hard:   { points: 6, seconds: 60, label: "Hard",   badgeClass: "difficulty-badge--hard" },
};

export function getDifficultyMeta(d) {
  return DIFFICULTY_META[d] || DIFFICULTY_META.medium;
}

/** Aplica a dificuldade da rodada no estado (timer + pontos). Retorna o meta. */
export function applyDifficulty(d) {
  const meta = getDifficultyMeta(d);
  gameState.currentDifficulty = d;
  gameState.timerDuration = meta.seconds;
  gameState.roundPointsFull = meta.points;
  gameState.roundPointsHelp = meta.points - 1;
  return meta;
}
```

- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS.

- [ ] **Step 5: Integrar em `src/main.js`:**
  - Importar: `import { addScore, BONUS_POINTS } from "./core/scoring.js";` e `import { DIFFICULTY_META, getDifficultyMeta, applyDifficulty } from "./core/difficulty.js";`
  - Apagar de main.js: `let score1=0, score2=0;`, `const BONUS_POINTS=3;`, `const DIFFICULTY_META={...}`, `let currentDifficulty=...`, `let roundPointsFull=5, roundPointsHelp=4;` e `let timerDuration=50;`
  - Reescrever `addPoint` (mantém o nome; DOM fica, lógica vai para o core):

```js
function addPoint(team, amount) {
  addScore(team, amount);
  document.getElementById("score1").textContent = gameState.score1;
  document.getElementById("score2").textContent = gameState.score2;
  const panel = document.getElementById(team === 1 ? "scorePanel1" : "scorePanel2");
  panel.classList.remove("pulse"); void panel.offsetWidth; panel.classList.add("pulse");
  updateScoreboardUI();
}
```

  - Reescrever `applyRoundDifficulty` (parte pura sai, DOM fica):

```js
function applyRoundDifficulty(d) {
  applyDifficulty(d);
  updateScoreButtonLabels(); updateTimerStartLabel();
  timeLeft = gameState.timerDuration;
  document.getElementById("timer").textContent = gameState.timerDuration;
  updateTimerRing();
}
```

  - Em TODO o main.js, substituir as referências aos globais removidos pela forma `gameState.<campo>`: `score1`→`gameState.score1`, `score2`→`gameState.score2`, `currentDifficulty`→`gameState.currentDifficulty`, `roundPointsFull`→`gameState.roundPointsFull`, `roundPointsHelp`→`gameState.roundPointsHelp`, `timerDuration`→`gameState.timerDuration`. Em `difficultyBadgeHtml` e `markCorrect`, trocar `DIFFICULTY_META[d]||DIFFICULTY_META.medium` por `getDifficultyMeta(d)`. Em `resetScores`, trocar `score1=score2=0` por `gameState.score1 = 0; gameState.score2 = 0;`.

- [ ] **Step 6: Verificar** — `npm test`, `npm run lint` (sem referência a global removido), smoke test: marcar correto (+5 medium), correto com ajuda (+4), errado; placar nunca negativo; labels dos botões mudam com a dificuldade.

- [ ] **Step 7: Commit**

```bash
git add src/ tests/
git commit -m "refactor: core/scoring e core/difficulty com testes"
```

---

### Task 7: core/turns.js + core/double.js (TDD)

**Files:**
- Create: `src/core/turns.js`, `src/core/double.js`, `tests/turns.test.js`, `tests/double.test.js`
- Modify: `src/main.js`

- [ ] **Step 1: Escrever testes que falham — `tests/turns.test.js`:**

```js
import { describe, it, expect, beforeEach } from "vitest";
import { gameState, resetGameState } from "../src/core/state.js";
import { advanceTeamTurn, nextAnsweringPlayer } from "../src/core/turns.js";

describe("turns", () => {
  beforeEach(() => resetGameState());

  it("advanceTeamTurn alterna 1 → 2 → 1", () => {
    expect(gameState.activeTeam).toBe(1);
    advanceTeamTurn();
    expect(gameState.activeTeam).toBe(2);
    advanceTeamTurn();
    expect(gameState.activeTeam).toBe(1);
  });

  it("nextAnsweringPlayer rotaciona o roster em round-robin", () => {
    const names = ["Ana", "Bia", "Caio"];
    expect(nextAnsweringPlayer(1, names)).toBe("Ana");
    expect(nextAnsweringPlayer(1, names)).toBe("Bia");
    expect(nextAnsweringPlayer(1, names)).toBe("Caio");
    expect(nextAnsweringPlayer(1, names)).toBe("Ana");
  });

  it("rosters dos dois times rotacionam de forma independente", () => {
    nextAnsweringPlayer(1, ["Ana", "Bia"]);
    expect(nextAnsweringPlayer(2, ["Davi", "Edu"])).toBe("Davi");
    expect(nextAnsweringPlayer(1, ["Ana", "Bia"])).toBe("Bia");
  });

  it("roster vazio → jogador vazio", () => {
    expect(nextAnsweringPlayer(1, [])).toBe("");
    expect(gameState.currentAnsweringPlayer).toBe("");
  });
});
```

**`tests/double.test.js`:**

```js
import { describe, it, expect, beforeEach } from "vitest";
import { gameState, resetGameState } from "../src/core/state.js";
import { trackCorrect, resetStreak, acceptDoubleBet, declineDoubleBet, settleDouble } from "../src/core/double.js";

describe("double or nothing", () => {
  beforeEach(() => resetGameState());

  it("dispara na 3ª correta seguida e zera o streak", () => {
    expect(trackCorrect(1)).toBe(false);
    expect(trackCorrect(1)).toBe(false);
    expect(trackCorrect(1)).toBe(true);
    expect(gameState.consecutiveCorrect[1]).toBe(0);
    expect(gameState.doubleTeam).toBe(1);
  });

  it("streaks são por time; resetStreak zera só o time dado", () => {
    trackCorrect(1); trackCorrect(1);
    trackCorrect(2);
    resetStreak(1);
    expect(gameState.consecutiveCorrect[1]).toBe(0);
    expect(gameState.consecutiveCorrect[2]).toBe(1);
  });

  it("aceitar a aposta ativa o double e dá a vez ao time que apostou", () => {
    trackCorrect(2); trackCorrect(2); trackCorrect(2);
    gameState.doubleWaiting = true;
    acceptDoubleBet();
    expect(gameState.doubleActive).toBe(true);
    expect(gameState.doubleWaiting).toBe(false);
    expect(gameState.activeTeam).toBe(2);
  });

  it("recusar limpa tudo", () => {
    gameState.doubleTeam = 1; gameState.doubleWaiting = true;
    declineDoubleBet();
    expect(gameState.doubleActive).toBe(false);
    expect(gameState.doubleTeam).toBe(0);
    expect(gameState.doubleWaiting).toBe(false);
  });

  it("acertou a rodada dupla → delta positivo; errou → negativo; flags limpas", () => {
    gameState.doubleActive = true; gameState.doubleTeam = 1;
    expect(settleDouble(true, 5)).toEqual({ team: 1, delta: 5 });
    expect(gameState.doubleActive).toBe(false);
    expect(gameState.doubleTeam).toBe(0);

    gameState.doubleActive = true; gameState.doubleTeam = 2;
    expect(settleDouble(false, 6)).toEqual({ team: 2, delta: -6 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL.

- [ ] **Step 3: Criar `src/core/turns.js`:**

```js
import { gameState } from "./state.js";

export function advanceTeamTurn() {
  gameState.activeTeam = gameState.activeTeam === 1 ? 2 : 1;
}

/** Round-robin no roster do time. Muda gameState.currentAnsweringPlayer e retorna o nome ("" se vazio). */
export function nextAnsweringPlayer(team, names) {
  if (!names.length) { gameState.currentAnsweringPlayer = ""; return ""; }
  const idx = gameState.playerTurnIndex[team] % names.length;
  gameState.currentAnsweringPlayer = names[idx];
  gameState.playerTurnIndex[team] = (idx + 1) % names.length;
  return gameState.currentAnsweringPlayer;
}
```

**`src/core/double.js`:**

```js
import { gameState } from "./state.js";

export const DOUBLE_STREAK = 3;

/** Registra uma correta sem ajuda. Retorna true quando o time atinge a streak (e arma doubleTeam). */
export function trackCorrect(team) {
  gameState.consecutiveCorrect[team] = (gameState.consecutiveCorrect[team] || 0) + 1;
  if (gameState.consecutiveCorrect[team] >= DOUBLE_STREAK) {
    gameState.consecutiveCorrect[team] = 0;
    gameState.doubleTeam = team;
    return true;
  }
  return false;
}

export function resetStreak(team) {
  gameState.consecutiveCorrect[team] = 0;
}

export function acceptDoubleBet() {
  gameState.doubleActive = true;
  gameState.doubleWaiting = false;
  gameState.activeTeam = gameState.doubleTeam;
}

export function declineDoubleBet() {
  gameState.doubleActive = false;
  gameState.doubleTeam = 0;
  gameState.doubleWaiting = false;
}

/** Liquida a rodada dupla: retorna { team, delta } e limpa as flags. */
export function settleDouble(correct, points) {
  const delta = correct ? points : -points;
  const team = gameState.doubleTeam;
  gameState.doubleActive = false;
  gameState.doubleTeam = 0;
  return { team, delta };
}
```

- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS.

- [ ] **Step 5: Integrar em `src/main.js`:**
  - Importar os dois módulos.
  - Apagar os globais: `activeTeam, turnTeam` / `playerTurnIndex` / `currentAnsweringPlayer` / `consecutiveCorrect, doubleActive, doubleTeam, doubleWaiting` e as funções `advanceTeamTurn`.
  - `assignAnsweringPlayer` vira (DOM fica, rotação vai para o core):

```js
function assignAnsweringPlayer(t) {
  const name = nextAnsweringPlayer(t, getTeamPlayerNames(t));
  const pEl = document.getElementById("pickedPlayer"), hEl = document.getElementById("pickedPlayerHint");
  if (!name) { pEl.textContent = ""; hEl.textContent = ""; return; }
  pEl.textContent = "▶ " + name + " answers";
  hEl.textContent = "Correct = +" + gameState.roundPointsFull + " · With help = +" + gameState.roundPointsHelp;
}
```

  - `checkDoubleOrNothing` vira:

```js
function checkDoubleOrNothing(team) {
  if (trackCorrect(team)) showDoubleBanner(team);
}
```

  - `acceptDouble` troca as 3 linhas de mutação (`doubleActive=true; doubleWaiting=false; ... activeTeam=doubleTeam;`) por `acceptDoubleBet();` (resto — esconder banner, log, `newChallenge()` — fica igual). Atenção: ler o nome do time ANTES de chamar `acceptDoubleBet()`? Não — `acceptDoubleBet` não zera `doubleTeam`; a leitura `gameState.doubleTeam===1?...` continua válida.
  - `declineDouble`: ler o nome do time (`const name = gameState.doubleTeam===1?gameState.team1name:gameState.team2name;`) ANTES de chamar `declineDoubleBet()` (que zera `doubleTeam`); resto igual.
  - `resolveDouble` vira:

```js
function resolveDouble(correct, normalPoints) {
  document.getElementById("challengePanel").classList.remove("double-round");
  const name = gameState.doubleTeam === 1 ? gameState.team1name : gameState.team2name;
  const { team, delta } = settleDouble(correct, normalPoints);
  addPoint(team, delta);
  if (correct) {
    addToLog("🎲 DOUBLE WON! +" + normalPoints + " bonus for " + name + "! (this round total: +" + (normalPoints * 2) + ")");
    launchConfetti();
  } else {
    addToLog("💥 DOUBLE LOST! " + name + " loses −" + normalPoints + " pts this round.");
  }
}
```

  - Em `markCorrect`/`markWrong`: `consecutiveCorrect[turnTeam]=0` → `resetStreak(gameState.turnTeam)`.
  - Substituir em todo o main.js: `activeTeam`→`gameState.activeTeam`, `turnTeam`→`gameState.turnTeam`, `doubleActive`→`gameState.doubleActive`, `doubleTeam`→`gameState.doubleTeam`, `doubleWaiting`→`gameState.doubleWaiting`, `currentAnsweringPlayer`→`gameState.currentAnsweringPlayer`. Em `resetScores`: `playerTurnIndex={1:0,2:0}` → `gameState.playerTurnIndex = { 1: 0, 2: 0 };` e `consecutiveCorrect={1:0,2:0}` → `gameState.consecutiveCorrect = { 1: 0, 2: 0 };` e flags double via gameState.
  - Aproveitar e migrar os globais restantes para `gameState`, apagando as declarações: `team1name/team2name`, `currentMode/isRandom`, `roundLocked`, `soundEnabled/confettiEnabled`, `currentAnswer`, `bonusAnswer/bonusRevealed` → todas as referências viram `gameState.<campo>` (a ponte de `setSoundEnabled`/`setConfettiEnabled` passa a atribuir `gameState.soundEnabled`/`gameState.confettiEnabled`). Ficam como variáveis de módulo apenas: `timeLeft`, `timerInterval`, `audioCtx`, `TIMER_RING_R`, `TIMER_RING_LEN` (vão para os módulos de UI na Task 9).

- [ ] **Step 6: Verificar** — `npm test`, `npm run lint`, smoke test completo do double: 3 corretas seguidas → banner; aceitar → próxima rodada vale dobro (acertar: +pts extra; errar: −pts); recusar → jogo normal. Rotação de jogadores com 2+ players por time.

- [ ] **Step 7: Commit**

```bash
git add src/ tests/
git commit -m "refactor: core/turns e core/double com testes; estado consolidado em gameState"
```

---

### Task 8: Registro de modos + 7 módulos de modo + newChallenge genérico

**Files:**
- Create: `src/modes/registry.js`, `src/modes/name3.js`, `src/modes/emoji.js`, `src/modes/sentence.js`, `src/modes/translation.js`, `src/modes/oddOne.js`, `src/modes/rhyme.js`, `src/modes/describe.js`, `src/ui/challenge.js`, `tests/modes.test.js`
- Modify: `src/main.js`

**Contrato** (documentar via JSDoc em `registry.js`):

```js
/**
 * @typedef {Object} RenderSpec
 * @property {string} promptHtml                       HTML do prompt principal
 * @property {string} answer                           resposta para o Reveal
 * @property {{html: string, answer: string}|null} [bonus]  sub-desafio opcional
 * @property {string[]} [options]                      botões de múltipla escolha
 * @property {string}  [emojiHtml]                     conteúdo do #emojiArea
 * @property {string}  [panelClass]                    classe extra do painel (ex.: "challenge-bonus")
 * @property {boolean} [showReveal]                    default: true sem options, false com options
 *
 * @typedef {Object} GameMode
 * @property {string} key          chave do usedPools
 * @property {string} title        título exibido e logado
 * @property {Array}  pool         pool de desafios
 * @property {string} [answerLabel] rótulo da resposta ("answer" default; name3 usa "examples")
 * @property {function(Object): RenderSpec} render
 */
```

- [ ] **Step 1: Escrever teste que falha — `tests/modes.test.js`:**

```js
import { describe, it, expect } from "vitest";
import { modes, createRegistry } from "../src/modes/registry.js";

describe("mode registry", () => {
  it("tem os 7 modos na ordem dos botões setMode(0..6)", () => {
    expect(modes.map((m) => m.key)).toEqual([
      "name3", "emoji", "sentence", "translation", "oddone", "rhyme", "describe",
    ]);
  });

  it("todo modo renderiza qualquer item do próprio pool sem DOM", () => {
    modes.forEach((mode) => {
      mode.pool.forEach((item) => {
        const spec = mode.render(item);
        expect(spec.promptHtml, mode.key).toBeTruthy();
        expect(typeof spec.answer, mode.key).toBe("string");
        expect(spec.answer.length, mode.key).toBeGreaterThan(0);
        if (spec.bonus) {
          expect(spec.bonus.html).toBeTruthy();
          expect(spec.bonus.answer).toBeTruthy();
        }
      });
    });
  });

  it("modos de múltipla escolha expõem options contendo a resposta", () => {
    const choice = modes.filter((m) => m.key === "sentence" || m.key === "oddone");
    choice.forEach((mode) => {
      const spec = mode.render(mode.pool[0]);
      expect(spec.options.length).toBeGreaterThan(1);
      expect(spec.options).toContain(spec.answer);
    });
  });

  it("registro rejeita modo sem as propriedades obrigatórias", () => {
    expect(() => createRegistry([{ key: "x" }])).toThrow(/missing required/);
    expect(() => createRegistry([{ key: "x", title: "X", pool: [], render: () => ({}) }])).toThrow(/empty pool/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL.

- [ ] **Step 3: Criar os 7 módulos de modo.** Os strings de HTML são copiados EXATAMENTE dos branches atuais de `newChallenge` (zero mudança de texto exibido).

**`src/modes/name3.js`:**

```js
import { name3Challenges } from "../data/name3.js";
import { BONUS_POINTS } from "../core/scoring.js";

export const name3Mode = {
  key: "name3",
  title: "Name 3 Things",
  pool: name3Challenges,
  answerLabel: "examples",
  render(item) {
    const text = item && item.text ? item.text : "";
    const word = (item.examples || "").split(",")[0].trim();
    return {
      promptHtml: "<strong>" + text + "</strong><br><small>In English only!</small>",
      answer: item.examples || "Three valid examples in English.",
      bonus: word
        ? {
            html: "<strong>✍️ Bonus (+" + BONUS_POINTS + " pts):</strong> Use <strong>" + word + "</strong> in an English sentence!",
            answer: 'Any correct English sentence using the word "' + word + '"',
          }
        : null,
    };
  },
};
```

**`src/modes/emoji.js`:**

```js
import { emojiPuzzles } from "../data/emoji.js";
import { BONUS_POINTS } from "../core/scoring.js";

export const emojiMode = {
  key: "emoji",
  title: "Emoji + Sentence",
  pool: emojiPuzzles,
  render(item) {
    return {
      promptHtml: "What is this in English?",
      emojiHtml: "<span class='emoji'>" + item.emoji + "</span>",
      answer: item.answer,
      bonus: {
        html: "<strong>✍️ Bonus (+" + BONUS_POINTS + " pts):</strong> Create an English sentence using <strong>" + item.answer + "</strong>!",
        answer: 'Any correct English sentence using "' + item.answer + '"',
      },
    };
  },
};
```

**`src/modes/sentence.js`:**

```js
import { sentenceChallenges } from "../data/sentence.js";
import { BONUS_POINTS } from "../core/scoring.js";

export const sentenceMode = {
  key: "sentence",
  title: "Complete the Sentence",
  pool: sentenceChallenges,
  render(item) {
    return {
      promptHtml: "<strong>" + item.sentence + "</strong>",
      answer: item.answer,
      options: item.options,
      bonus: {
        html: "<strong>✍️ Bonus (+" + BONUS_POINTS + " pts):</strong> Now say the full sentence in English!",
        answer: "The full correct sentence with: " + item.answer,
      },
    };
  },
};
```

**`src/modes/translation.js`:**

```js
import { translationChallenges } from "../data/translation.js";
import { BONUS_POINTS } from "../core/scoring.js";

export const translationMode = {
  key: "translation",
  title: "Translation + Negative",
  pool: translationChallenges,
  render(item) {
    const dir = item.type === "en-pt" ? "Translate to Portuguese:" : "Translate to English:";
    return {
      promptHtml: "<strong>" + dir + "</strong><br><br><em>" + item.text + "</em>",
      answer: item.answer,
      bonus: item.negative
        ? {
            html: "<strong>➕ Bonus (+" + BONUS_POINTS + " pts):</strong> Say the <strong>negative form</strong> of this sentence in English!",
            answer: item.negative,
          }
        : null,
    };
  },
};
```

**`src/modes/oddOne.js`:**

```js
import { oddOneChallenges } from "../data/oddOne.js";
import { BONUS_POINTS } from "../core/scoring.js";

export const oddOneMode = {
  key: "oddone",
  title: "Odd One Out",
  pool: oddOneChallenges,
  render(item) {
    return {
      promptHtml: "<strong>Which one doesn't belong? (Odd one out)</strong>",
      answer: item.odd,
      options: [...item.items].sort(() => Math.random() - 0.5),
      bonus: {
        html: "<strong>🗣️ Bonus (+" + BONUS_POINTS + " pts):</strong> Explain in English <em>why</em> it doesn't belong to the group!",
        answer: item.reason,
      },
    };
  },
};
```

**`src/modes/rhyme.js`:**

```js
import { rhymeChallenges } from "../data/rhyme.js";
import { BONUS_POINTS } from "../core/scoring.js";

export const rhymeMode = {
  key: "rhyme",
  title: "Rhyme Time",
  pool: rhymeChallenges,
  render(item) {
    return {
      promptHtml:
        "<strong>Name 3 words that rhyme with:</strong><br><span style='font-size:2em;font-weight:800;color:var(--accent-yellow)'>" + item.word + "</span>",
      answer: "Exemplos: " + item.rhymes.slice(0, 5).join(", "),
      panelClass: "challenge-bonus",
      bonus: {
        html: "<strong>✍️ Bonus (+" + BONUS_POINTS + " pts):</strong> Use the word <strong>" + item.word + "</strong> in an English sentence!",
        answer: 'Any correct English sentence using "' + item.word + '"',
      },
    };
  },
};
```

**`src/modes/describe.js`:**

```js
import { describeChallenges } from "../data/describe.js";
import { BONUS_POINTS } from "../core/scoring.js";

export const describeMode = {
  key: "describe",
  title: "Describe It!",
  pool: describeChallenges,
  render(item) {
    return {
      promptHtml:
        "<strong>Describe this word in English without saying it:</strong><br><span style='font-size:1.8em;font-weight:800;color:var(--accent-purple)'>" + item.word + "</span>",
      answer: item.word + (item.ptAnswer ? " / " + item.ptAnswer : ""),
      panelClass: "challenge-bonus",
      bonus: {
        html: "<strong>✍️ Bonus (+" + BONUS_POINTS + " pts):</strong> " + item.sentence,
        answer: 'Any correct English sentence using "' + item.word + '"',
      },
    };
  },
};
```

- [ ] **Step 4: Criar `src/modes/registry.js`** (com o JSDoc do contrato acima no topo):

```js
import { name3Mode } from "./name3.js";
import { emojiMode } from "./emoji.js";
import { sentenceMode } from "./sentence.js";
import { translationMode } from "./translation.js";
import { oddOneMode } from "./oddOne.js";
import { rhymeMode } from "./rhyme.js";
import { describeMode } from "./describe.js";

const REQUIRED = ["key", "title", "pool", "render"];

/** Valida o contrato de cada modo na carga — falha rápido e claro. */
export function createRegistry(modeList) {
  modeList.forEach((m) => {
    REQUIRED.forEach((p) => {
      if (m[p] === undefined) throw new Error("Game mode missing required property '" + p + "' (mode: " + (m.key || m.title || "?") + ")");
    });
    if (!Array.isArray(m.pool) || !m.pool.length) throw new Error("Game mode '" + m.key + "' has an empty pool");
    if (typeof m.render !== "function") throw new Error("Game mode '" + m.key + "' render must be a function");
  });
  return modeList;
}

// A ordem AQUI define os índices de setMode(0..6) — deve casar com os botões do index.html.
export const modes = createRegistry([
  name3Mode, emojiMode, sentenceMode, translationMode, oddOneMode, rhymeMode, describeMode,
]);
```

- [ ] **Step 5: Rodar e ver passar** — `npm test` → PASS (todos os arquivos de teste).

- [ ] **Step 6: Criar `src/ui/challenge.js`** (rendering genérico do painel, substitui o miolo dos 7 branches):

```js
/** Pinta um RenderSpec no painel de desafio. onOptionSelected: callback dos botões de múltipla escolha. */
export function renderChallenge(spec, { onOptionSelected } = {}) {
  const text = document.getElementById("challengeText");
  text.className = "challenge-text";
  text.innerHTML = spec.promptHtml;
  document.getElementById("emojiArea").innerHTML = spec.emojiHtml || "";

  const area = document.getElementById("optionsArea");
  area.innerHTML = "";
  area.removeAttribute("data-answered");
  (spec.options || []).forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "option-btn";
    btn.textContent = opt; btn.dataset.option = opt;
    btn.onclick = () => onOptionSelected && onOptionSelected(opt);
    area.appendChild(btn);
  });

  const sub = document.getElementById("subChallengeBox");
  if (spec.bonus) { sub.innerHTML = spec.bonus.html; sub.style.display = "block"; }
  else { sub.innerHTML = ""; sub.style.display = "none"; }
  document.getElementById("revealBonusBtn").style.display = spec.bonus ? "inline-block" : "none";
  document.getElementById("bonusCorrectBtn").style.display = "none";

  const showReveal = spec.showReveal !== undefined ? spec.showReveal : !(spec.options && spec.options.length);
  document.getElementById("revealBtn").style.display = showReveal ? "inline-block" : "none";
}
```

- [ ] **Step 7: Reescrever `newChallenge` em `src/main.js`** (apagar os 7 branches, o array `titles` e as funções `setupBonus` e `getN3Prompt`):

```js
import { modes } from "./modes/registry.js";
import { renderChallenge } from "./ui/challenge.js";

function newChallenge() {
  const panel = document.getElementById("challengePanel");
  panel.classList.remove("challenge-panel--idle", "challenge-bonus");
  if (gameState.doubleActive) panel.classList.add("double-round");
  else panel.classList.remove("double-round");
  setAwaitingScore(false); setRoundLocked(false);

  if (gameState.isRandom) gameState.currentMode = Math.floor(Math.random() * modes.length);
  const mode = modes[gameState.currentMode];
  const item = pickFromPool(mode.pool, mode.key);
  const spec = mode.render(item);

  gameState.currentAnswer = spec.answer || "";
  gameState.currentAnswerLabel = mode.answerLabel || "answer";
  gameState.bonusAnswer = spec.bonus ? spec.bonus.answer : "";
  gameState.bonusRevealed = false;

  renderChallenge(spec, { onOptionSelected: checkAnswer });
  if (spec.panelClass) panel.classList.add(spec.panelClass);

  applyRoundDifficulty(item.difficulty);
  setModeTitleWithDifficulty(gameState.isRandom ? "Random Challenge" : mode.title, item.difficulty);
  gameState.turnTeam = gameState.activeTeam;
  assignAnsweringPlayer(gameState.turnTeam);
  updateTeamTurnDisplay();
  startTimer();
  const playerNote = gameState.currentAnsweringPlayer ? " (" + gameState.currentAnsweringPlayer + " answers)" : "";
  const teamName = gameState.activeTeam === 1 ? gameState.team1name : gameState.team2name;
  const doubleNote = gameState.doubleActive ? " 🎲 DOUBLE ROUND!" : "";
  addToLog(teamName + " — " + mode.title + playerNote + doubleNote);
  advanceTeamTurn();
  updateNewChallengeButton();
}
```

- [ ] **Step 8: Atualizar os consumidores do rótulo da resposta** em main.js (eram `currentMode===0 ? "examples" : "answer"`):
  - Em `markWrong`: `const label = gameState.currentAnswerLabel;`
  - Em `revealAnswer`: `const label = gameState.currentAnswerLabel.charAt(0).toUpperCase() + gameState.currentAnswerLabel.slice(1);`
  - Apagar os imports/usos antigos dos pools em main.js (`name3Challenges` etc. agora são usados só pelos modos) — remover os 7 imports de `./data/` de main.js.

- [ ] **Step 9: Verificar** — `npm test`, `npm run lint`, e smoke completo dos 7 modos: prompts idênticos, Reveal aparece nos modos sem options, options clicáveis com highlight verde/vermelho, bonus revela e pontua +3, rhyme/describe têm a borda especial (`challenge-bonus`), modo Random sorteia e loga o título real do modo.

- [ ] **Step 10: Commit**

```bash
git add src/ tests/
git commit -m "refactor: registro de modos + newChallenge genérico + ui/challenge"
```

---

### Task 9: Extrair ui/ + audio + wiring de eventos (remove handlers inline e a ponte)

**Files:**
- Create: `src/audio.js`, `src/ui/confetti.js`, `src/ui/timer.js`, `src/ui/log.js`, `src/ui/scoreboard.js`, `src/ui/settings.js`, `src/ui/doubleBanner.js`, `src/ui/keyboard.js`
- Modify: `src/main.js`, `index.html`

Ordem de extração respeita dependências (log e audio primeiro). Em cada extração: mover verbatim, adicionar `export`, trocar referências de globais antigos por `gameState.<campo>` (a maioria já foi trocada nas tasks 6–7).

- [ ] **Step 1: `src/audio.js`** — mover `getAudioCtx`, `playBeep`, `playSound` e a variável `let audioCtx=null;`. Exportar `playSound`. `playBeep` checa `gameState.soundEnabled` (importar `gameState`).

- [ ] **Step 2: `src/ui/log.js`** — mover `addToLog`, exportar.

- [ ] **Step 3: `src/ui/confetti.js`** — mover `launchConfetti`, exportar (checa `gameState.confettiEnabled`).

- [ ] **Step 4: `src/ui/timer.js`** — mover `let timeLeft, timerInterval`, `TIMER_RING_R`, `TIMER_RING_LEN`, `updateTimerStartLabel`, `updateTimerRing`, `startTimer`, `pauseTimer`, `resetTimer`. Exportar `startTimer`, `pauseTimer`, `resetTimer`, `updateTimerStartLabel`, `updateTimerRing` e um helper novo `syncTimerToDuration()`:

```js
export function syncTimerToDuration() {
  timeLeft = gameState.timerDuration;
  document.getElementById("timer").textContent = gameState.timerDuration;
  updateTimerRing();
}
```

`applyRoundDifficulty` em main.js passa a chamar `syncTimerToDuration()` no lugar das 3 linhas de timer. `startTimer` importa `playSound` de `../audio.js` e `addToLog` de `./log.js`. Exportar também `isTimerRunning()` (`return timerInterval !== null;`) para o atalho Space.

- [ ] **Step 5: `src/ui/scoreboard.js`** — mover `addPoint`, `updateScoreboardUI`, `updateScoreRosters`, `updateTeamTurnDisplay`, `getTeamPlayerNames`, `updateScoreButtonLabels`; exportar todas. Importa `gameState`, `addScore`, `BONUS_POINTS`.

- [ ] **Step 6: `src/ui/settings.js`** — mover `openSettingsModal`, `closeSettingsModal`, `updateModeButtons`, `updatePlayerListEmpty`, `setTeamNames`, `addPlayer`, `removePlayer`, `setMode`, `randomMode`; exportar as usadas fora. Importa `gameState`, `addToLog`, `updateScoreboardUI`, `updateScoreRosters`, `updateTeamTurnDisplay`.

- [ ] **Step 7: ampliar `src/ui/challenge.js` e criar `src/ui/doubleBanner.js`.**
  - Mover para `src/ui/challenge.js` (verbatim + export): `updateNewChallengeButton`, `setAwaitingScore`, `setRoundLocked`, `clearChallengeArea`, `highlightOptionButtons`, `difficultyBadgeHtml`, `setModeTitleWithDifficulty`, `revealAnswer`, `revealBonus`. Isso evita ciclos de import (doubleBanner e timer dependem dessas funções de painel).
  - Mover `clearAnsweringPlayerDisplay` para `src/ui/scoreboard.js` (verbatim + export).
  - Criar `src/ui/doubleBanner.js` com `showDoubleBanner` movido verbatim (incluindo o comentário de bloco do fluxo double) + export. Importa `gameState`, `playSound` de `../audio.js`, `updateNewChallengeButton` de `./challenge.js`.

- [ ] **Step 8: `src/ui/keyboard.js`** — mover o bloco `document.addEventListener("keydown", ...)` para uma função exportada:

```js
export function initKeyboard({ onNewChallenge, onCorrect, onCorrectHelp, onWrong, onStartTimer }) {
  document.addEventListener("keydown", (e) => {
    // ... corpo idêntico ao atual, chamando os callbacks no lugar das funções diretas
  });
}
```

(Corpo movido verbatim, trocando `newChallenge()`→`onNewChallenge()`, `markCorrect("full")`→`onCorrect()`, `markCorrect("help")`→`onCorrectHelp()`, `markWrong()`→`onWrong()`, `if(!timerInterval)startTimer()`→`onStartTimer()` — e este último callback em main.js faz `if (!isTimerRunning()) startTimer();`. Os guards de modal/roundLocked/doubleWaiting permanecem verbatim, usando `gameState`.)

- [ ] **Step 9: Reescrever `src/main.js` como bootstrap fino.** Conteúdo final: imports de tudo; as funções de ORQUESTRAÇÃO que cruzam camadas (`newChallenge`, `markCorrect`, `markWrong`, `checkAnswer`, `markBonusCorrect`, `resolveDouble`, `acceptDouble`, `declineDouble`, `checkDoubleOrNothing`, `assignAnsweringPlayer`, `applyRoundDifficulty`, `resetScores`, `resetUsedChallenges`); o wiring de eventos; e o init. **Apagar a ponte `Object.assign(window, ...)`.**

Wiring (substitui TODOS os handlers inline):

```js
function wireEvents() {
  document.querySelector(".settings-fab").addEventListener("click", openSettingsModal);
  document.querySelector(".modal-backdrop").addEventListener("click", closeSettingsModal);
  document.querySelector(".modal-close").addEventListener("click", closeSettingsModal);
  document.querySelector(".modal-done").addEventListener("click", closeSettingsModal);
  document.getElementById("randomModeBtn").addEventListener("click", randomMode);
  document.querySelectorAll(".mode-btn").forEach((btn, i) => btn.addEventListener("click", () => setMode(i)));
  document.querySelector(".modal-save-names").addEventListener("click", setTeamNames);
  [1, 2].forEach((t) => {
    document.getElementById("addPlayer" + t + "Btn").addEventListener("click", () => addPlayer(t));
    document.getElementById("player" + t).addEventListener("keydown", (e) => { if (e.key === "Enter") addPlayer(t); });
  });
  document.getElementById("soundEnabled").addEventListener("change", (e) => { gameState.soundEnabled = e.target.checked; });
  document.getElementById("confettiEnabled").addEventListener("change", (e) => { gameState.confettiEnabled = e.target.checked; });
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
}

function init() {
  wireEvents();
  applyRoundDifficulty("medium"); updateScoreButtonLabels(); resetTimer();
  updateScoreboardUI(); updateModeButtons();
  updatePlayerListEmpty(1); updatePlayerListEmpty(2);
  clearChallengeArea(); updateNewChallengeButton();
  addToLog("Ready! Easy +4/40s · Medium +5/50s · Hard +6/60s (with help: −1).");
  addToLog("All modes have Bonus (+3 pts). Get 3 right in a row → Double or Nothing! 🎲");
}
init(); // módulo é deferred — DOM já está parseado (substitui window.onload)
```

Obs.: `revealAnswer`/`revealBonus` foram movidos para `ui/challenge.js`; `revealBonus` chama `markBonusCorrect`-related DOM apenas (mostrar `bonusCorrectBtn`) — manter comportamento idêntico. `removePlayer` continua bound via JS dentro de `addPlayer` (sem mudança).

- [ ] **Step 10: Limpar `index.html`:** remover TODOS os atributos `onclick=`, `onchange=`, `onkeydown=` e adicionar os IDs novos usados pelo wiring:
  - Botão "Add" do time 1 → `id="addPlayer1Btn"`; do time 2 → `id="addPlayer2Btn"`.
  - Botão "Reset scores" → `id="resetScoresBtn"`; "Reshuffle challenges" → `id="reshuffleBtn"`.
  - Botão "⏸ Pause" → `id="timerPauseBtn"`; "Restart" → `id="timerResetBtn"`.

- [ ] **Step 11: Verificar que não restou handler inline nem ponte**

Run: `grep -nE 'onclick=|onchange=|onkeydown=' index.html`
Expected: nenhuma ocorrência.
Run: `grep -n "Object.assign(window" src/main.js`
Expected: nenhuma ocorrência.
Run: `npm test && npm run lint`
Expected: PASS / sem erros.

- [ ] **Step 12: Smoke test COMPLETO** (todas as interações agora passam pelo wiring novo): os 11 itens do checklist de verificação do spec (seção "Verificação"), exceto o item de build (Task 10).

- [ ] **Step 13: Commit**

```bash
git add index.html src/
git commit -m "refactor: extrai ui/ e audio; substitui handlers inline por addEventListener"
```

---

### Task 10: Build, documentação e fechamento

**Files:**
- Modify: `CLAUDE.md`, `README.md`

- [ ] **Step 1: Build de produção**

Run: `npm run build && npm run preview`
Expected: build sem erros; jogo funcionando no preview (smoke rápido).

- [ ] **Step 2: Reescrever `CLAUDE.md`** refletindo a nova estrutura: comandos (`npm run dev/build/test/lint`), mapa de camadas (core/modes/data/ui/main), contrato `GameMode`/`RenderSpec`, "Common edits" atualizado (adicionar desafio = editar `src/data/*.js`; adicionar modo = criar `modes/x.js` + `data/x.js` + registrar + botão no HTML). Manter as seções de convenções que continuam valendo (UI em inglês, comentários EN/PT, IDs hardcoded).

- [ ] **Step 3: Atualizar `README.md`** — seção "Como rodar" (`npm install && npm run dev`; build com `npm run build`) e estrutura de pastas. Manter a descrição do jogo.

- [ ] **Step 4: Checklist final de fumaça** — rodar os 11 itens da seção "Verificação" do spec, na build de dev E no preview da build de produção.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: atualiza CLAUDE.md e README para a estrutura modular"
```

---

## Critério de pronto (Definition of Done)

1. `npm test` verde (≥ 6 arquivos de teste: pool, scoring, difficulty, turns, double, modes).
2. `npm run lint` sem erros; `npm run build` sem erros.
3. `index.html` sem nenhum `<style>`, `<script>` inline ou handler `on*=`.
4. `src/main.js` sem declarações de estado (`let`) de jogo — tudo em `gameState`.
5. Checklist de fumaça do spec (11 itens) passando em dev e na build.
6. `CLAUDE.md` e `README.md` descrevem a estrutura nova.
