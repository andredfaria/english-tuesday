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
