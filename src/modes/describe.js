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
