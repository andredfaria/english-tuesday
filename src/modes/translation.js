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
