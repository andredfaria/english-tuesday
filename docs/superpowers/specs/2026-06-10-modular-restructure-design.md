# Design: Reestruturação Modular — English Tuesday

**Data:** 2026-06-10
**Branch:** `refactor/modular-structure`
**Status:** Aprovado para planejamento de implementação

## Objetivo

Transformar o `index.html` monolítico (~1300 linhas: CSS + HTML + JS + dados) em uma
estrutura modular, testável e fácil de manter. **Refatoração pura: nenhuma mudança de
funcionalidade, visual ou regra de jogo.** O jogo joga exatamente igual.

## Decisões de escopo

| Decisão | Escolha |
|---|---|
| Distribuição | npm/build aceito (Vite dev + build estático; hospedável depois) |
| Escopo | Só organizar o código — sem features novas (sem persistência, sem editor) |
| Stack | JavaScript vanilla + ES modules (sem TypeScript, sem framework) |
| Abordagem | Camadas + registro de modos (Abordagem B) |

## Arquitetura

### Estrutura de arquivos

```
english-tuesday/
├── index.html              # só o esqueleto HTML — sem CSS/JS inline
├── package.json            # vite + vitest + eslint + prettier
├── vite.config.js
├── src/
│   ├── main.js             # bootstrap: importa módulos, registra addEventListener
│   │                       #   (substitui todos os onclick= inline)
│   ├── core/               # LÓGICA PURA — zero DOM, 100% testável
│   │   ├── state.js        # gameState: objeto único com todo o estado mutável
│   │   ├── scoring.js      # addPoint (clamp ≥ 0), pontos por dificuldade
│   │   ├── turns.js        # alternância de time, rotação de jogador
│   │   ├── pool.js         # pickFromPool, usedPools, reshuffle (no-repeat)
│   │   ├── difficulty.js   # DIFFICULTY_META, lógica pura de dificuldade
│   │   └── double.js       # regras do double-or-nothing (trigger, resolve)
│   ├── modes/
│   │   ├── registry.js     # lista de modos registrados; valida o contrato na carga
│   │   ├── name3.js
│   │   ├── emoji.js
│   │   ├── sentence.js
│   │   ├── translation.js
│   │   ├── oddOne.js
│   │   ├── rhyme.js
│   │   └── describe.js
│   ├── data/               # SÓ DADOS — pools de desafios, um arquivo por modo
│   │   ├── name3.js
│   │   ├── emoji.js
│   │   ├── sentence.js
│   │   ├── translation.js
│   │   ├── oddOne.js
│   │   ├── rhyme.js
│   │   └── describe.js
│   ├── ui/                 # tudo que toca o DOM
│   │   ├── challenge.js    # pinta prompt/options/emoji/bonus no painel
│   │   ├── scoreboard.js   # placar, chips de time, painéis, rosters
│   │   ├── timer.js        # anel do timer, start/stop/tick
│   │   ├── log.js          # sidebar de log
│   │   ├── settings.js     # modal de configurações
│   │   ├── doubleBanner.js # banner do double-or-nothing
│   │   ├── confetti.js
│   │   └── keyboard.js     # atalhos N / 1 / 2 / 3 / 4 / Space
│   └── audio.js            # WebAudio beeps
├── styles/
│   ├── base.css            # :root vars, reset, tipografia
│   ├── layout.css          # grid .app, sidebar, painel de desafio
│   └── components.css      # botões, chips, timer ring, modal, banner
└── tests/
    ├── pool.test.js        # no-repeat até esgotar; reshuffle ao esgotar/reset
    ├── scoring.test.js     # clamp ≥ 0; pontos full/help por dificuldade
    ├── turns.test.js       # alternância de time; rotação de jogador no roster
    └── double.test.js      # 3 corretas seguidas → trigger; ganho ×2; perda −pts
```

### Mudança arquitetural central: registro de modos

Hoje `newChallenge()` é um dispatcher de 7 branches `if/else` sobre `currentMode`.
Cada branch repete a mesma sequência: pegar item do pool → renderizar prompt →
definir resposta → configurar bônus.

Na nova estrutura, cada modo é um módulo autocontido que exporta:

```js
/**
 * @typedef {Object} GameMode
 * @property {string} key        — chave do usedPools (ex.: "name3")
 * @property {string} title      — título exibido (ex.: "Name 3 Things")
 * @property {Array}  pool       — pool de desafios (importado de data/)
 * @property {function(item): RenderSpec} render
 */

/**
 * @typedef {Object} RenderSpec
 * @property {string}  promptHtml          — HTML do prompt principal
 * @property {string}  answer              — resposta p/ botão Reveal
 * @property {{html: string, answer: string}=} bonus — sub-desafio opcional
 * @property {string[]=} options           — modos de múltipla escolha (já embaralhadas quando o modo exigir)
 * @property {string=}  emojiHtml          — conteúdo do #emojiArea
 * @property {string=}  panelClass         — ex.: "challenge-bonus"
 * @property {boolean=} showReveal         — exibe o botão Reveal (default: true quando não há options)
 */
```

`newChallenge()` vira uma função genérica (~20 linhas): resolve o modo (fixo ou
aleatório via `registry.length` — sem número mágico `7`), chama
`mode.render(pickFromPool(mode.pool, mode.key))` e entrega o `RenderSpec` para
`ui/challenge.js` pintar. O fechamento da rodada (dificuldade, turno, timer, log)
continua genérico como hoje.

**Adicionar um modo novo** = criar `modes/x.js` + `data/x.js` + registrar em
`registry.js` + adicionar o botão no `index.html`. Nada no núcleo muda.

### Fluxo de dados e regras de dependência

```
main.js (eventos) ──► core/ (muda gameState) ──► ui/ (reflete no DOM)
```

- `core/` **nunca** importa de `ui/` nem toca o DOM.
- `data/` não importa nada (literais puros).
- `modes/` importa de `data/` e devolve `RenderSpec` (strings/objetos — sem DOM).
- `ui/` lê `gameState` e pinta; eventos chamam funções de `core/` via `main.js`.

### Estado

Os ~25 globais soltos (`score1`, `activeTeam`, `doubleActive`, …) viram um objeto
`gameState` único em `core/state.js`, com a mesma mutabilidade simples de hoje —
sem store reativa, sem pub/sub (YAGNI). Constantes (`BONUS_POINTS`,
`DIFFICULTY_META`, `TIMER_RING_*`) ficam nos módulos donos delas.

## Tooling

- **Vite** — `npm run dev` (dev server) e `npm run build` (gera `dist/` estático).
  Configuração padrão.
- **Vitest** — `npm test`, cobrindo `core/`.
- **ESLint + Prettier** — config flat padrão, sem regras exóticas.
- **JSDoc** nos contratos principais (`GameMode`, `RenderSpec`, shape dos itens de
  cada pool) — documentação leve sem custo de TypeScript.

## Tratamento de erros

Mesmo nível de hoje (app de sala de aula, sem rede, sem persistência). Única adição:
`registry.js` valida na carga que todo modo registrado tem `key`, `title`, `pool`
não-vazio e `render` — lança erro claro imediatamente se o contrato for violado.

## Plano de migração incremental

Branch `refactor/modular-structure`, commits pequenos; **cada passo termina com o
jogo funcionando**:

1. **Scaffold** — `package.json`, Vite, ESLint/Prettier; `index.html` ainda
   monolítico rodando dentro do Vite (prova que o tooling não quebrou nada).
2. **Extrair CSS** → `styles/` (3 arquivos). Verificação visual.
3. **Extrair dados** → `data/` (7 pools; mudança mais segura — literais).
4. **Extrair `core/` com testes primeiro** — escrever os testes Vitest contra o
   comportamento atual *antes* de mover a lógica. Os testes travam o comportamento.
5. **Registro de modos** — converter os 7 branches em módulos; `newChallenge`
   genérico.
6. **Extrair `ui/` + `main.js`** — trocar `onclick=` inline por `addEventListener`.
   Último passo porque toca tudo.
7. **Limpeza final** — atualizar `CLAUDE.md` e `README.md` para a nova estrutura.

## Verificação

- **Automática:** Vitest em `core/` (pool, scoring, turns, double).
- **Manual (checklist de fumaça, ao fim de cada etapa da migração):**
  1. `npm run dev`, abrir o jogo — layout idêntico ao original.
  2. Rodar uma rodada de **cada um dos 7 modos** (prompt, resposta, bônus aparecem).
  3. Marcar correto (1), com ajuda (4/3) e errado (2) — placar atualiza, clamp em 0.
  4. Múltipla escolha (modos 2 e 4): clicar opção certa e errada.
  5. Forçar 3 acertos seguidos → banner double aparece; testar aceitar (ganho ×2)
     e recusar.
  6. Bônus: revelar e marcar correto (+3).
  7. Atalhos de teclado: N, 1, 2, 3, 4, Space.
  8. Modal de configurações: renomear times, editar rosters, som/confetti on/off.
  9. Timer: inicia, anel anima, beep ao esgotar.
  10. "Reshuffle challenges" resincroniza os pools.
  11. `npm run build` + preview do `dist/` — tudo funciona no build.

## Fora de escopo

- Persistência (localStorage), editor de conteúdo, novos modos/desafios,
  TypeScript, frameworks, mudanças visuais ou de regras.
