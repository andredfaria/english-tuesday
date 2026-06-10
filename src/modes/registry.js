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
